-- =====================================================================
-- TAP Client Hub — LEAN data model (v7)   |   13 tables, matches the ERD
-- Target: Supabase (Postgres 15+). ~15 users, US + India, ~941 clients.
-- Run ONCE on a fresh database. This is the trimmed model: it mirrors the
-- LIVE app's shape and drops the extra normalization (no groups/contacts/
-- firm-settings/separate tax-id/bank tables) so it stays easy to manage and report.
--
-- WHAT'S DELIBERATELY SIMPLE
--   • emails & phones are text[] arrays ON the client row (the Excel crams many
--     into one cell; the live API already returns arrays). No contacts table.
--   • group is a plain text column, not a table. No join to report by group.
--   • ein stays on the client row (as the live app does). Move it out later only
--     if you decide to lock it down.
--   • sales-tax bank details live ON the registration row as *_ref pointers
--     (never raw account numbers). No separate bank table.
--   • Everything a service accumulates hangs off ONE hub table, client_services.
--
-- THE 13 TABLES
--   profiles · clients · services · client_services · work_periods ·
--   period_counts · service_comments · sales_tax_registration · credentials ·
--   client_service_billing · annual_filing · time_entries · audit_log
-- =====================================================================

create extension if not exists pg_trgm;

create type app_role     as enum ('admin','manager','staff','offshore');   -- admin = Owner/Admin
create type client_type  as enum ('business','personal');
create type svc_freq     as enum ('weekly','bi_weekly','semi_monthly',
                                  'monthly','quarterly','yearly','annual');
create type svc_tracking as enum ('stage','count');
create type work_stage   as enum ('locked','not_started','in_progress',
                                  'waiting_client','prepared','done','na');
create type return_type  as enum ('C-corp','S-corp','SMLLC','Partnership',
                                  'Trust','Non-profit','Retirement Plan','1040');

-- 1. profiles (Users & Access) --------------------------------------
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text,
  role              app_role not null default 'staff',
  location          text,                         -- 'US' / 'India'
  reporting_manager uuid references profiles(id), -- FK, not a name string
  modules           text[] not null default '{}',
  can_manage_users  boolean not null default false,
  email_2fa_enabled boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create or replace function auth_role() returns app_role
  language sql stable security definer set search_path = public as $$
    select role from profiles where id = (select auth.uid()) $$;
create or replace function is_privileged() returns boolean
  language sql stable security definer set search_path = public as $$
    select coalesce((select role in ('admin','manager') from profiles where id=(select auth.uid())),false) $$;
create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
    select coalesce((select role='admin' from profiles where id=(select auth.uid())),false) $$;

-- 2. clients --------------------------------------------------------
create table clients (
  id           uuid primary key default gen_random_uuid(),
  client_code  text unique,                   -- the app's cid ("234")
  name         text not null,
  key_name     text,                          -- short/display name
  type         client_type not null default 'business',
  group_name   text,                          -- plain string; report by group directly
  status       text not null default 'active',
  city text, state text, zip text, address text,
  emails       text[] not null default '{}',  -- multiple per client (Excel one-cell list)
  phones       text[] not null default '{}',
  ein          text,                          -- kept here to match the live model
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 3. services (catalog) ---------------------------------------------
create table services (
  id       uuid primary key default gen_random_uuid(),
  code     text unique not null,              -- FIN,PR,STX,T9,REND,TAX,ANNUAL,RENEWAL
  name     text not null,
  tracking svc_tracking not null default 'stage'
);

-- 4. client_services — THE HUB --------------------------------------
-- One row per ENABLED service for a client. Disabled = no row (that's the fix for
-- the 3.9 MB payload). reg_label lets one client hold several of the same service
-- (sales-tax registrations). detail jsonb holds type-specific NON-secret fields:
--   tax:{filingState,filingMonth,filingType} payroll:{paydate,payPeriodFrequency,
--   reportingMethod,biweeklyCode,payStartDate,qbLicense,payEmails} fin:{financialsMonth}
create table client_services (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  service_id      uuid not null references services(id),
  reg_label       text not null default '',
  assigned_to     uuid references profiles(id),  -- FK, not a name
  active          boolean not null default true,
  frequency       svc_freq,
  processor       text,                          -- ADP, QuickBooks Desktop, ...
  due_month       smallint,                      -- tax/annual/renewal filing month (1-12)
  expected_annual int,                           -- 1099s target
  filing_state    text,                          -- tax returns: state filed in
  return_type     return_type,                   -- tax returns: entity type (1:1 with client)
  detail          jsonb not null default '{}',   -- NEVER secrets (those go to credentials)
  notes           text,
  unique (client_id, service_id, reg_label),
  check (due_month is null or due_month between 1 and 12)
);

-- 5. work_periods — stage per month (YYYY-MM => prior years native) --
create table work_periods (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,
  stage             work_stage not null default 'not_started',
  done_by           uuid references profiles(id),
  done_at           timestamptz,
  unique (client_service_id, period),
  check (period ~ '^\d{4}-\d{2}$')
);

-- 6. period_counts — payroll runs / 1099 forms per month ------------
create table period_counts (
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,
  processed         int not null default 0,
  expected          int,
  updated_by        uuid references profiles(id),
  updated_at        timestamptz not null default now(),
  primary key (client_service_id, period),
  check (processed >= 0),
  check (period ~ '^\d{4}-\d{2}$')
);

-- 7. service_comments — per client + service + month (many allowed) --
create table service_comments (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  month             smallint,                    -- 0..11
  period            text,                        -- 'YYYY-MM' once anchored to a year
  body              text not null,
  author_id         uuid references profiles(id),
  author_label      text,                        -- raw source value ("You", email)
  created_at        timestamptz not null default now(),
  check (month is null or month between 0 and 11)
);

-- 8. sales_tax_registration — several per client --------------------
-- Bank fields are *_ref pointers (masked / vault reference), never raw numbers.
create table sales_tax_registration (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  rt_number         text,
  tax_reg_id        text,
  frequency         svc_freq,
  assigned_to       uuid references profiles(id),
  bank_name         text,
  bank_account_ref  text,                        -- vault pointer / masked, not raw
  bank_routing_ref  text,
  notes             text
);

-- 9. credentials (Password Vault) -----------------------------------
-- Store vault_ref, NEVER the password. client_id null => firm-wide login.
create table credentials (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete cascade,
  group_label  text,
  site         text not null,                   -- ADP, TX Comptroller, EFTPS...
  url          text,
  username     text,
  vault_ref    text,                            -- pointer to 1Password/Bitwarden (not the pw)
  is_bank      boolean not null default false,
  purpose      text,
  additional_info_1 text,
  additional_info_2 text,
  notes        text
);

-- 10. client_service_billing — OWNER-ONLY fees ----------------------
create table client_service_billing (
  client_service_id uuid primary key references client_services(id) on delete cascade,
  monthly_fee numeric(12,2)
);

-- 11. annual_filing (Annual Reports / State Renewals) ---------------
-- Identifying #s / passwords live in credentials; cost is owner-only (kept here,
-- gated by policy). state, company, due date, website, contact.
create table annual_filing (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  state         text,
  company_name  text,
  due_date      date,
  website       text,
  contact_name  text,
  credential_id uuid references credentials(id),
  cost          numeric(12,2),                   -- owner-only (see policy)
  notes         text
);

-- 12. time_entries (Timesheet, editable + audited) ------------------
create table time_entries (
  id                uuid primary key default gen_random_uuid(),
  who               uuid not null references profiles(id),
  client_id         uuid references clients(id) on delete set null,
  client_service_id uuid references client_services(id) on delete set null,
  task              text,
  started_at        timestamptz,
  seconds           int not null default 0,
  note              text,
  edited            boolean not null default false,
  created_at        timestamptz not null default now(),
  check (seconds >= 0)
);

-- 13. audit_log -----------------------------------------------------
create table audit_log (
  id     bigserial primary key,
  actor  uuid references profiles(id),
  action text, entity text, entity_id text,
  detail jsonb,
  at     timestamptz not null default now()
);

-- ---------- Indexes (keep it fast for global users) ----------------
create index idx_clients_name_trgm  on clients using gin (name gin_trgm_ops);
create index idx_clients_group      on clients (group_name);
create index idx_cs_client_active   on client_services (client_id) where active;
create index idx_cs_service_active  on client_services (service_id, active);
create index idx_cs_assignee_active on client_services (assigned_to, active);
create index idx_cs_detail          on client_services using gin (detail);
create index idx_wp_period          on work_periods (period);
create index idx_wp_year            on work_periods (substr(period,1,4));
create index idx_pc_year            on period_counts (substr(period,1,4));
create index idx_sc_cs              on service_comments (client_service_id, month);
create index idx_stx_cs             on sales_tax_registration (client_service_id);
create index idx_creds_client       on credentials (client_id);
create index idx_annual_client      on annual_filing (client_id);
create index idx_time_who           on time_entries (who, started_at desc);

create or replace function touch_updated_at() returns trigger language plpgsql as
  $$ begin new.updated_at = now(); return new; end $$;
create trigger trg_clients_touch before update on clients
  for each row execute function touch_updated_at();

-- ---------- Row-Level Security (auth wrapped (select ...)) ----------
alter table profiles               enable row level security;
alter table clients                enable row level security;
alter table services               enable row level security;
alter table client_services        enable row level security;
alter table work_periods           enable row level security;
alter table period_counts          enable row level security;
alter table service_comments       enable row level security;
alter table sales_tax_registration enable row level security;
alter table credentials            enable row level security;
alter table client_service_billing enable row level security;
alter table annual_filing          enable row level security;
alter table time_entries           enable row level security;
alter table audit_log              enable row level security;

create policy profiles_self on profiles for select to authenticated
  using (id=(select auth.uid()) or (select is_admin()));
create policy profiles_admin on profiles for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

-- Readable by any signed-in user
create policy r_clients on clients               for select to authenticated using (true);
create policy r_services on services             for select to authenticated using (true);
create policy r_cs on client_services            for select to authenticated using (true);
create policy r_wp on work_periods               for select to authenticated using (true);
create policy r_pc on period_counts              for select to authenticated using (true);
create policy r_sc on service_comments           for select to authenticated using (true);
create policy r_stx on sales_tax_registration    for select to authenticated using (true);
create policy r_annual on annual_filing          for select to authenticated using (true);

-- Operational writes: admin/manager/staff (offshore may add comments)
create policy w_clients on clients               for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_cs on client_services            for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_stx on sales_tax_registration    for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_annual on annual_filing          for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_sc on service_comments           for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff','offshore')) with check ((select auth_role()) in ('admin','manager','staff','offshore'));

-- Stage/counts: staff full; offshore only their assigned rows
create policy w_wp_staff on work_periods for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_wp_offshore on work_periods for update to authenticated
  using ((select auth_role())='offshore' and exists (select 1 from client_services cs where cs.id=work_periods.client_service_id and cs.assigned_to=(select auth.uid())))
  with check (true);
create policy w_pc_staff on period_counts for all to authenticated
  using ((select auth_role()) in ('admin','manager','staff')) with check ((select auth_role()) in ('admin','manager','staff'));
create policy w_pc_offshore on period_counts for update to authenticated
  using ((select auth_role())='offshore' and exists (select 1 from client_services cs where cs.id=period_counts.client_service_id and cs.assigned_to=(select auth.uid())))
  with check (true);

-- Service catalog: admin only
create policy w_services on services for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

-- Vault: privileged (admin/manager) only
create policy p_creds on credentials for all to authenticated
  using ((select is_privileged())) with check ((select is_privileged()));

-- Fees: OWNER (admin) only
create policy o_billing on client_service_billing for all to authenticated
  using ((select is_admin())) with check ((select is_admin()));

-- Timesheet: own rows; privileged read all
create policy t_own  on time_entries for all to authenticated
  using (who=(select auth.uid())) with check (who=(select auth.uid()));
create policy t_read on time_entries for select to authenticated using ((select is_privileged()));

-- Audit: privileged read; anyone signed-in appends
create policy a_read on audit_log for select to authenticated using ((select is_privileged()));
create policy a_ins  on audit_log for insert to authenticated with check ((select auth.uid()) is not null);

-- ---------- Seed catalog -------------------------------------------
insert into services (code,name,tracking) values
  ('FIN','Monthly Financials','stage'),
  ('PR','Payroll','count'),
  ('STX','Sales Tax','stage'),
  ('T9','1099s','count'),
  ('REND','Renditions','stage'),
  ('TAX','Tax Returns','stage'),
  ('ANNUAL','Annual Reports','stage'),
  ('RENEWAL','State Renewal','stage')
on conflict (code) do nothing;

-- ---------- Views the app reads ------------------------------------
-- Lean list (fixes the 3.9 MB /api/clients): only enabled services, ~8 cols.
create view v_clients_list with (security_invoker = on) as
  select c.id, c.client_code as cid, c.name, c.type, c.group_name,
         c.city, c.state, c.status,
         coalesce(jsonb_agg(distinct s.code) filter (where cs.active),'[]'::jsonb) as active_services,
         count(*) filter (where cs.active) as service_count
  from clients c
  left join client_services cs on cs.client_id=c.id and cs.active
  left join services s on s.id=cs.service_id
  group by c.id;

-- Workload rollup (no fees, ever).
create view v_workload with (security_invoker = on) as
  select p.id staff_id, p.full_name staff, mgr.full_name manager,
         count(*) filter (where cs.active) touchpoints,
         count(distinct cs.client_id) filter (where cs.active) client_count
  from profiles p
  left join profiles mgr on mgr.id=p.reporting_manager
  left join client_services cs on cs.assigned_to=p.id
  group by p.id, p.full_name, mgr.full_name;
-- =====================================================================
