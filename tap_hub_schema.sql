-- ═══════════════════════════════════════════════════════
-- TAP Client Hub · Database Schema v2
-- Supabase (PostgreSQL 15)
-- ═══════════════════════════════════════════════════════

-- ══ EXTENSIONS ══
create extension if not exists "uuid-ossp";

-- ══ ENUMS ══
do $$ begin
  create type client_type      as enum ('business', 'personal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type service_tracking as enum ('stage', 'count');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type work_stage       as enum ('not_started', 'in_progress', 'waiting_client', 'prepared', 'done', 'na');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type user_role        as enum ('admin', 'manager', 'staff', 'offshore');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type invite_status    as enum ('invited', 'active', 'disabled');
exception when duplicate_object then null;
end $$;

-- ═══════════════════════════════════════════════
-- CATALOG TABLES
-- ═══════════════════════════════════════════════

-- ── services: fixed service catalog ──
create table if not exists services (
  id              uuid primary key default gen_random_uuid(),
  code            varchar(10)  not null unique check (code in ('FIN','PR','STX','T9','REND','TAX','RENEWAL')),
  name            text         not null,
  tracking        service_tracking not null default 'stage',
  active          boolean      not null default true,
  frequency       text,         -- monthly, quarterly, yearly
  processor       text,         -- ADP, Toast, QuickBooks, ...
  software        text,
  expected_annual int          default 0,
  created_at      timestamptz  not null default now()
);

-- ── profiles: staff / users ──
create table if not exists profiles (
  id                uuid primary key default gen_random_uuid(),
  full_name         text         not null,
  role              user_role    not null default 'staff',
  location          text,
  reporting_manager text,        -- name of manager
  modules           text[]       not null default '{}',  -- e.g. {clients,workload,fin,pr,stx,t9,rend,vault,support}
  invite_status     invite_status not null default 'invited',
  active            boolean      not null default true,
  totp_secret       text,        -- TOTP secret for 2FA (encrypted)
  totp_enabled      boolean      not null default false,
  created_at        timestamptz  not null default now()
);

-- ═══════════════════════════════════════════════
-- CLIENT TABLES
-- ═══════════════════════════════════════════════

-- ── clients ──
create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  cid          text generated always as ('CID-' || substring(id::text, 1, 4)) stored,
  name         text            not null,
  type         client_type     not null,
  entity_type  text,            -- Single-member LLC, S-Corp, Partnership, ...
  group_owner  text,            -- Terry, Lindsay, Misty, Jill, Aaron, Paula
  status       text            not null default 'active',
  city         text,
  state        text            default 'TX',
  zip          text,
  address      text,
  created_at   timestamptz     not null default now()
);

-- ── contacts: client contacts ──
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── client_tax_ids ──
create table if not exists client_tax_ids (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  id_type     text not null,       -- EIN, SSN, ITIN
  id_number   text not null,
  is_primary  boolean default false,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════
-- CREDENTIALS / VAULT
-- ═══════════════════════════════════════════════

create table if not exists credentials (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  group_label text,            -- "Firm-wide" when client_id is null
  portal      text not null,
  username    text,
  vault_ref   text,            -- pointer to password manager
  is_bank     boolean not null default false,
  link_url    text,            -- for bank link-outs
  notes       text,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════
-- SERVICE ASSIGNMENTS
-- ═══════════════════════════════════════════════

-- ── client_services: which services a client has ──
create table if not exists client_services (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  service_id      uuid not null references services(id) on delete restrict,
  assigned_to     text,            -- staff name or profile ID
  active          boolean not null default true,
  frequency       text,            -- monthly, quarterly, yearly
  processor       text,
  expected_annual int,
  created_at      timestamptz not null default now(),
  unique(client_id, service_id)
);

-- ═══════════════════════════════════════════════
-- WORK TRACKING (two modes: stage vs count)
-- ═══════════════════════════════════════════════

-- ── work_periods: stage-based tracking (FIN, STX, REND, TAX) ──
-- Each row = one period (YYYY-MM) for one client_service
create table if not exists work_periods (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,      -- "YYYY-MM"
  stage             work_stage not null default 'not_started',
  done_by           text,               -- profile ID or name
  done_at           timestamptz,
  created_at        timestamptz not null default now(),
  unique(client_service_id, period)
);

-- ── period_counts: count-based tracking (PR, T9) ──
-- Each row = one period (YYYY-MM) with processed/expected counts
create table if not exists period_counts (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,      -- "YYYY-MM"
  processed         int not null default 0,
  expected          int,                -- null for T9 (uses annual target)
  created_at        timestamptz not null default now(),
  unique(client_service_id, period)
);

-- ═══════════════════════════════════════════════
-- TIME TRACKING
-- ═══════════════════════════════════════════════

create table if not exists time_entries (
  id                uuid primary key default gen_random_uuid(),
  who               uuid not null references profiles(id),
  client_id         uuid references clients(id),
  client_service_id uuid references client_services(id),
  task              text,
  started_at        timestamptz,
  seconds           int not null default 0,
  note              text,
  edited            boolean not null default false,
  edited_by         uuid references profiles(id),
  edited_at         timestamptz,
  created_at        timestamptz not null default now()
);

-- ═══════════════════════════════════════════════
-- BILLING
-- ═══════════════════════════════════════════════

create table if not exists billing_periods (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  period      text not null,          -- "YYYY-MM"
  amount      numeric(10,2),
  status      text default 'pending', -- pending, invoiced, paid
  notes       text,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════

create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,        -- e.g. 'stage_change', 'count_update', 'login'
  entity_type text,                 -- 'work_period', 'period_count', etc.
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════

create index if not exists idx_clients_group      on clients(group_owner);
create index if not exists idx_clients_status      on clients(status);
create index if not exists idx_clients_type        on clients(type);

create index if not exists idx_contacts_client     on contacts(client_id);

create index if not exists idx_creds_client        on credentials(client_id);
create index if not exists idx_creds_bank          on credentials(is_bank) where is_bank = true;

create index if not exists idx_cs_client           on client_services(client_id);
create index if not exists idx_cs_service          on client_services(service_id);

create index if not exists idx_wp_cs               on work_periods(client_service_id);
create index if not exists idx_wp_period           on work_periods(period);
create index if not exists idx_wp_stage            on work_periods(stage);

create index if not exists idx_pc_cs               on period_counts(client_service_id);
create index if not exists idx_pc_period           on period_counts(period);

create index if not exists idx_te_who              on time_entries(who);
create index if not exists idx_te_client           on time_entries(client_id);

create index if not exists idx_audit_actor         on audit_log(actor_id);
create index if not exists idx_audit_entity        on audit_log(entity_type, entity_id);

-- ═══════════════════════════════════════════════
-- RLS (Row Level Security) — enable on all tables
-- ═══════════════════════════════════════════════

do $$ declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('services')  -- services is public read
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ── services: public read ──
create policy "services_public_read" on services
  for select using (true);
