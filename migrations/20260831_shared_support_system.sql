-- Firm-wide AI FusionIQ Labs support system.
--
-- Turns the TAP-only support_tickets table into a shared support system of
-- record used by multiple FusionIQ apps, while keeping the existing
-- support_tickets table and its data fully compatible.
--
-- Idempotent: safe to run more than once. Everything is schema-qualified.
--
-- NOTE on the firm-wide ticket id: support_tickets.ticket_number (bigint,
-- "TAP-XXXXXX" in the TAP UI) keeps its original, TAP-only semantics and is
-- left untouched. A new external_id column ("AIF-000001"…) is added as the
-- unique, cross-app ticket id. It is populated from the dedicated sequence
-- support_tickets_external_id_seq via a column DEFAULT. Existing rows are
-- backfilled exactly once (only rows where external_id IS NULL are touched).

-- 1) support_apps registry ----------------------------------------------------
create table if not exists tap_hub_project.support_apps (
  key text primary key,
  display_name text not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into tap_hub_project.support_apps (key, display_name, active, metadata)
values
  ('tap-hub',      'TAP Hub',      true, '{"kind":"internal"}'::jsonb),
  ('carry-ops',    'Carry Ops',    true, '{"kind":"external"}'::jsonb),
  ('transact-ops', 'Transact Ops', true, '{"kind":"external"}'::jsonb)
on conflict (key) do update
  set display_name = excluded.display_name,
      active = excluded.active,
      updated_at = now();

-- 2) Expand support_tickets ---------------------------------------------------
alter table tap_hub_project.support_tickets
  add column if not exists source_app_key text not null default 'tap-hub'
    references tap_hub_project.support_apps(key),
  add column if not exists external_reference text,
  add column if not exists reporter_user_id text,
  add column if not exists category text,
  add column if not exists client_context jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_activity_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists closed_at timestamptz;

-- Firm-wide external id (AIF-000001…) — see note at top of file.
create sequence if not exists tap_hub_project.support_tickets_external_id_seq;
alter table tap_hub_project.support_tickets
  add column if not exists external_id text;

update tap_hub_project.support_tickets
   set external_id = 'AIF-' || lpad(nextval('tap_hub_project.support_tickets_external_id_seq')::text, 6, '0')
 where external_id is null;

alter table tap_hub_project.support_tickets
  alter column external_id set default ('AIF-' || lpad(nextval('tap_hub_project.support_tickets_external_id_seq')::text, 6, '0')),
  alter column external_id set not null;

create unique index if not exists support_tickets_external_id_key
  on tap_hub_project.support_tickets (external_id);
create index if not exists support_tickets_app_status_activity_idx
  on tap_hub_project.support_tickets (source_app_key, status, last_activity_at desc);
create index if not exists support_tickets_reporter_user_id_idx
  on tap_hub_project.support_tickets (reporter_user_id, created_at desc);
create index if not exists support_tickets_external_reference_idx
  on tap_hub_project.support_tickets (source_app_key, external_reference);

-- 3) Messages -----------------------------------------------------------------
create table if not exists tap_hub_project.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tap_hub_project.support_tickets(id) on delete cascade,
  author_type text not null check (author_type in ('reporter', 'agent', 'system')),
  author_name text,
  author_user_id text,
  body text not null check (length(trim(body)) > 0),
  visibility text not null default 'public' check (visibility in ('public', 'internal')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_time_idx
  on tap_hub_project.support_ticket_messages (ticket_id, created_at);
create index if not exists support_ticket_messages_visibility_idx
  on tap_hub_project.support_ticket_messages (ticket_id, visibility, created_at);

-- 4) Events (audit stream) ------------------------------------------------------
create table if not exists tap_hub_project.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tap_hub_project.support_tickets(id) on delete cascade,
  event_type text not null,
  actor_type text check (actor_type in ('reporter', 'agent', 'system')),
  actor_name text,
  actor_user_id text,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_events_ticket_time_idx
  on tap_hub_project.support_ticket_events (ticket_id, created_at);

-- 5) Attachments (metadata only — no file upload/storage behavior) -------------
create table if not exists tap_hub_project.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tap_hub_project.support_tickets(id) on delete cascade,
  message_id uuid references tap_hub_project.support_ticket_messages(id) on delete set null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  storage_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_attachments_ticket_idx
  on tap_hub_project.support_ticket_attachments (ticket_id, created_at);

-- 6) Triggers ------------------------------------------------------------------
-- Maintain updated_at / last_activity_at and keep closed_at coherent with status.
create or replace function tap_hub_project.support_tickets_maintain() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();

  if tg_op = 'INSERT' then
    new.last_activity_at = coalesce(new.last_activity_at, now());
    if new.status = 'closed' and new.closed_at is null then
      new.closed_at = now();
    end if;

  elsif tg_op = 'UPDATE' then
    -- Bump last activity only on a meaningful content/status change, not when
    -- the row is touched solely to update bookkeeping timestamps.
    if new.status is distinct from old.status
       or new.summary is distinct from old.summary
       or new.what_happened is distinct from old.what_happened
       or new.priority is distinct from old.priority
    then
      new.last_activity_at = now();
    end if;

    if new.status = 'closed' and old.status is distinct from 'closed' and new.closed_at is null then
      new.closed_at = now();
    elsif new.status is distinct from 'closed' and old.status = 'closed' then
      new.closed_at = null; -- reopened
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_maintain_trigger on tap_hub_project.support_tickets;
create trigger support_tickets_maintain_trigger
  before insert or update on tap_hub_project.support_tickets
  for each row execute function tap_hub_project.support_tickets_maintain();

-- A new agent message marks first_response_at; any message counts as activity.
create or replace function tap_hub_project.support_ticket_messages_notify() returns trigger
language plpgsql as $$
begin
  update tap_hub_project.support_tickets t
     set last_activity_at = now(),
         first_response_at = case
           when new.author_type = 'agent' and t.first_response_at is null then now()
           else t.first_response_at
         end
   where t.id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists support_ticket_messages_notify_trigger on tap_hub_project.support_ticket_messages;
create trigger support_ticket_messages_notify_trigger
  after insert on tap_hub_project.support_ticket_messages
  for each row execute function tap_hub_project.support_ticket_messages_notify();

-- 7) RLS + grants ---------------------------------------------------------------
-- RLS is enabled as defense in depth. Server routes use the service role,
-- which bypasses RLS. anon/authenticated get read-only access to the app
-- registry only; ticket data is service-role only.
alter table tap_hub_project.support_apps enable row level security;
alter table tap_hub_project.support_tickets enable row level security;
alter table tap_hub_project.support_ticket_messages enable row level security;
alter table tap_hub_project.support_ticket_events enable row level security;
alter table tap_hub_project.support_ticket_attachments enable row level security;

drop policy if exists "Support apps readable by all" on tap_hub_project.support_apps;
create policy "Support apps readable by all"
  on tap_hub_project.support_apps for select
  using (true);

grant usage on schema tap_hub_project to anon, authenticated, service_role;

grant select on tap_hub_project.support_apps to anon, authenticated, service_role;
grant insert, update, delete on tap_hub_project.support_apps to service_role;

grant select, insert, update, delete on tap_hub_project.support_tickets to service_role;
grant select, insert, update, delete on tap_hub_project.support_ticket_messages to service_role;
grant select, insert, update, delete on tap_hub_project.support_ticket_events to service_role;
grant select, insert, update, delete on tap_hub_project.support_ticket_attachments to service_role;
grant usage, select on sequence tap_hub_project.support_tickets_external_id_seq to service_role;

notify pgrst, 'reload schema';
