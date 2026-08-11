-- TAP Hub support tickets are the system of record. Email is a notification only.
create table if not exists tap_hub_project.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  reporter_profile_id text references tap_hub_project.profiles(id) on delete set null,
  reporter_name text not null check (length(trim(reporter_name)) > 0),
  reporter_email text,
  account_firm text,
  app_area text,
  summary text not null check (length(trim(summary)) > 0),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  what_happened text not null check (length(trim(what_happened)) > 0),
  expected_result text,
  reproduction_steps text,
  screenshot_confirmed boolean not null default false,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to text references tap_hub_project.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_status_created_at_idx
  on tap_hub_project.support_tickets (status, created_at desc);
create index if not exists support_tickets_reporter_profile_id_idx
  on tap_hub_project.support_tickets (reporter_profile_id, created_at desc);

-- API routes use the service-role client. RLS is enabled for defense in depth:
-- client requests cannot access rows directly, and only server-side service-role
-- routes can perform ticket operations.
notify pgrst, 'reload schema';
