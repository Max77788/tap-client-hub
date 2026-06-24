-- ═══════════════════════════════════════════════════════
-- TAP Client Hub · Database Schema v3
-- Schema: tap_hub (dedicated)
-- Supabase (PostgreSQL 15)
-- ═══════════════════════════════════════════════════════

-- ══ EXTENSIONS ══
create extension if not exists "uuid-ossp";

-- ══ SCHEMA ══
create schema if not exists tap_hub;

-- ══ TABLES (matching production structure) ══

-- services
create table if not exists tap_hub.services (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  active          boolean not null default true,
  tracking        text not null default 'stage'
);

-- profiles
create table if not exists tap_hub.profiles (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  role              text not null default 'staff',
  location          text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  org_id            uuid,
  user_id           uuid,
  avatar_url        text,
  reporting_manager uuid,
  modules           text[] not null default '{}',
  invite_status     text not null default 'invited',
  invited_at        timestamptz,
  last_login_at     timestamptz,
  totp_secret       text,
  totp_enabled      boolean not null default false
);

-- clients
create table if not exists tap_hub.clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null,
  entity_type  text,
  group_owner  text,
  status       text not null default 'active',
  city         text,
  state        text default 'TX',
  zip          text,
  address      text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

-- contacts
create table if not exists tap_hub.contacts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references tap_hub.clients(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  is_primary  boolean not null default false
);

-- client_tax_ids
create table if not exists tap_hub.client_tax_ids (
  client_id   uuid not null references tap_hub.clients(id) on delete cascade,
  ein         text,
  ssn_last4   text
);

-- credentials
create table if not exists tap_hub.credentials (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references tap_hub.clients(id) on delete cascade,
  portal      text not null,
  username    text,
  vault_ref   text,
  notes       text,
  group_label text,
  is_bank     boolean not null default false,
  link_url    text
);

-- client_services
create table if not exists tap_hub.client_services (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references tap_hub.clients(id) on delete cascade,
  service_id      uuid not null references tap_hub.services(id) on delete restrict,
  assigned_to     uuid,
  active          boolean not null default true,
  frequency       text,
  processor       text,
  software        text,
  started_on      date,
  ended_on        date,
  notes           text,
  expected_annual int,
  unique(client_id, service_id)
);

-- work_periods
create table if not exists tap_hub.work_periods (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references tap_hub.client_services(id) on delete cascade,
  period            text not null,
  stage             text not null default 'not_started',
  done_by           uuid,
  done_at           timestamptz,
  billed_at         timestamptz,
  paid_at           timestamptz,
  notes             text,
  unique(client_service_id, period)
);

-- period_counts
create table if not exists tap_hub.period_counts (
  client_service_id uuid not null references tap_hub.client_services(id) on delete cascade,
  period            text not null,
  processed         int not null default 0,
  expected          int,
  updated_by        uuid,
  updated_at        timestamptz,
  unique(client_service_id, period)
);

-- time_entries
create table if not exists tap_hub.time_entries (
  id                uuid primary key default gen_random_uuid(),
  who               uuid not null references tap_hub.profiles(id),
  client_id         uuid references tap_hub.clients(id),
  client_service_id uuid references tap_hub.client_services(id),
  task              text,
  started_at        timestamptz,
  seconds           int not null default 0,
  note              text,
  edited            boolean not null default false,
  edited_by         uuid references tap_hub.profiles(id),
  edited_at         timestamptz,
  created_at        timestamptz not null default now()
);

-- billing_periods
create table if not exists tap_hub.billing_periods (
  client_service_id uuid not null references tap_hub.client_services(id) on delete cascade,
  period            text not null,
  amount            numeric(10,2),
  invoiced_at       timestamptz,
  paid_at           timestamptz
);

-- audit_log
create table if not exists tap_hub.audit_log (
  id          bigint primary key generated by default as identity,
  actor       uuid references tap_hub.profiles(id),
  action      text not null,
  entity      text,
  entity_id   text,
  detail      jsonb,
  at          timestamptz not null default now()
);

-- ══ INDEXES ══

create index if not exists idx_clients_group      on tap_hub.clients(group_owner);
create index if not exists idx_clients_status      on tap_hub.clients(status);
create index if not exists idx_clients_type        on tap_hub.clients(type);

create index if not exists idx_contacts_client     on tap_hub.contacts(client_id);

create index if not exists idx_creds_client        on tap_hub.credentials(client_id);
create index if not exists idx_creds_bank          on tap_hub.credentials(is_bank) where is_bank = true;

create index if not exists idx_cs_client           on tap_hub.client_services(client_id);
create index if not exists idx_cs_service          on tap_hub.client_services(service_id);

create index if not exists idx_wp_cs               on tap_hub.work_periods(client_service_id);
create index if not exists idx_wp_period           on tap_hub.work_periods(period);
create index if not exists idx_wp_stage            on tap_hub.work_periods(stage);

create index if not exists idx_pc_cs               on tap_hub.period_counts(client_service_id);
create index if not exists idx_pc_period           on tap_hub.period_counts(period);

create index if not exists idx_te_who              on tap_hub.time_entries(who);
create index if not exists idx_te_client           on tap_hub.time_entries(client_id);

create index if not exists idx_audit_actor         on tap_hub.audit_log(actor);
create index if not exists idx_audit_entity        on tap_hub.audit_log(entity, entity_id);

-- ══ PERMISSIONS ══

grant usage on schema tap_hub to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema tap_hub to anon, authenticated, service_role;
