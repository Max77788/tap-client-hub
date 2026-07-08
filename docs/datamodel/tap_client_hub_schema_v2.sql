-- =====================================================================
-- TAP Client Hub — data model + access control (v2)
-- Postgres 15+.  Run ONCE into a fresh database.
--
-- What changed from v1 (driven by the decision log, not the old files):
--   • Two ways to track a service, set per service in `services.tracking`:
--       - 'stage'  Financials / Sales Tax / Renditions: one cell per month,
--                  advanced In progress -> Waiting on client -> Prepared -> Done.
--       - 'count'  Payroll & 1099s: a NUMBER per month (runs / forms done),
--                  rolled up to a monthly status.  (see `period_counts`)
--   • Payroll runs are counted per month (weekly 4-5, bi-weekly/semi-monthly
--     up to 2, monthly 1).  1099s are counted per month toward an annual total.
--   • Prior-year history is native: every period row is keyed 'YYYY-MM', so the
--     worklists can show any year by filtering on left(period,4).
--   • Users & Access: reporting manager, per-user module access, and invite /
--     self-set-password provisioning (we never store the password).
--   • Lean live timesheet: editable entries with an "edited" flag, fully audited.
--   • Vault grouped by entity; bank logins are LINK-OUTS only (no secret stored).
--   • Fees / billing stay OWNER-ONLY and isolated at the DB layer — they are not
--     present in any worklist or workload query (enforced by RLS, not just UI).
--
-- ---------------------------------------------------------------------
-- DEPLOYMENT NOTE — READ BEFORE RUNNING  (decision still open with Tushar)
--   The brief is: owned outright, on-premise, off the public internet, no
--   subscriptions, sellable with no external dependency.  This file uses the
--   Supabase auth shape (auth.users / auth.uid()) because that was the v1
--   starting point.  Two portable paths, pick one:
--     A) Self-hosted Supabase (Postgres + GoTrue) on the in-house box. Runs
--        as-is. Still "owned", no cloud subscription.
--     B) Plain Postgres + app-layer auth. Then:
--          - drop the `references auth.users(id)` on profiles.id (use a plain uuid);
--          - replace auth.uid() with current_setting('app.user_id')::uuid, which
--            the app sets per connection after login (see commented helper below).
--   Everything else (tables, RLS, roles) is identical either way.
-- =====================================================================

-- ---------- 0. Enumerated types -------------------------------------
create type app_role     as enum ('admin','manager','staff','offshore');  -- admin = Owner/Admin
create type client_type  as enum ('business','personal');
create type svc_freq     as enum ('weekly','bi_weekly','semi_monthly',
                                   'monthly','quarterly','yearly','annual');
create type svc_tracking as enum ('stage','count');                       -- how a service is tracked
create type work_stage   as enum ('not_started','in_progress','waiting_client',
                                   'prepared','done','na');
create type invite_state as enum ('invited','active','disabled');

-- ---------- 1. Profiles (1:1 with the login) ------------------------
-- Who can log in, their role, where they sit, who they report to, and which
-- modules they may open. Password is NEVER stored here (auth handles it).
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  role               app_role not null default 'staff',
  location           text,                       -- 'Houston, TX' / 'Pune, India'
  reporting_manager  uuid references profiles(id),-- workload rolls up to this person
  modules            text[] not null default '{}',-- e.g. {clients,fin,pr,vault,...}
  invite_status      invite_state not null default 'invited',
  invited_at         timestamptz,
  last_login_at      timestamptz,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Helper functions. SECURITY DEFINER so the role lookup isn't blocked by RLS.
create or replace function auth_role() returns app_role
  language sql stable security definer set search_path = public as $$
    select role from profiles where id = auth.uid()
$$;
create or replace function is_privileged() returns boolean   -- admin OR manager
  language sql stable security definer set search_path = public as $$
    select coalesce((select role in ('admin','manager')
                     from profiles where id = auth.uid()), false)
$$;
create or replace function is_admin() returns boolean         -- Owner/Admin only
  language sql stable security definer set search_path = public as $$
    select coalesce((select role = 'admin'
                     from profiles where id = auth.uid()), false)
$$;
-- PLAIN-POSTGRES ALTERNATIVE (path B): replace auth.uid() above with
--   nullif(current_setting('app.user_id', true),'')::uuid
-- and have the app run  SET app.user_id = '<profile-id>'  after each login.

-- ---------- 2. Core (non-sensitive) operational data ----------------
create table clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        client_type not null default 'business',
  entity_type text,                       -- single-member LLC, S-corp, ...
  group_owner text,
  status      text not null default 'active',
  city text, state text, zip text, address text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table contacts (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  name text, email text, phone text,
  is_primary boolean not null default false
);

create table services (
  id       uuid primary key default gen_random_uuid(),
  code     text unique not null,           -- FIN, PR, STX, T9, REND, TAX, RENEWAL
  name     text not null,
  tracking svc_tracking not null default 'stage',  -- 'stage' or 'count'
  active   boolean not null default true
);

-- The heart of the model: one row per (client x service).
-- Turning a service "on" = insert/activate a row; "off" = active=false.
-- Every worklist is just a filter on this table.
create table client_services (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  service_id      uuid not null references services(id),
  assigned_to     uuid references profiles(id),
  active          boolean not null default true,
  frequency       svc_freq,
  processor       text,                    -- ADP, Toast, QuickBooks, ...
  software        text,
  expected_annual int,                     -- 1099s: total forms expected this year
  started_on      date, ended_on date,
  notes           text,
  unique (client_id, service_id)
);

-- 'stage' services: one row per client_service per month.
-- `period` is 'YYYY-MM', so EVERY prior year is retained automatically.
create table work_periods (
  id                uuid primary key default gen_random_uuid(),
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,         -- 'YYYY-MM'
  stage             work_stage not null default 'not_started',
  done_by           uuid references profiles(id),
  done_at timestamptz,
  notes             text,
  unique (client_service_id, period)
);

-- 'count' services (Payroll, 1099s): a number per month.
--   processed = runs done / forms filed that month.
--   expected  = payroll runs expected that month (4-5 weekly, 2 bi-weekly,
--               2 semi-monthly, 1 monthly). 1099 monthly expected may be null;
--               its annual target lives on client_services.expected_annual.
-- Keyed by 'YYYY-MM' -> prior-year history is native here too.
create table period_counts (
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,         -- 'YYYY-MM'
  processed         int  not null default 0,
  expected          int,
  updated_by        uuid references profiles(id),
  updated_at        timestamptz not null default now(),
  primary key (client_service_id, period),
  check (processed >= 0)
);

-- Lean live timesheet. Entries are editable by their owner; a correction
-- sets edited=true (the UI shows an "edited" tag) and is written to audit_log.
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
  edited_by         uuid references profiles(id),
  edited_at         timestamptz,
  created_at        timestamptz not null default now(),
  check (seconds >= 0)
);

-- ---------- 3. Sensitive data (isolated tables) ---------------------
-- Split out so RLS restricts them to the few. None of these appear in any
-- worklist or workload query.
create table client_tax_ids (             -- PII: EIN / SSN last 4
  client_id uuid primary key references clients(id) on delete cascade,
  ein text, ssn_last4 text
);

-- BILLING — OWNER-ONLY, and deliberately NOT joined into worklists/workload.
create table client_service_billing (     -- the monthly fee
  client_service_id uuid primary key references client_services(id) on delete cascade,
  monthly_fee numeric(12,2)
);
create table billing_periods (            -- what was invoiced / collected per month
  client_service_id uuid not null references client_services(id) on delete cascade,
  period            text not null,        -- 'YYYY-MM'
  amount            numeric(12,2),
  invoiced_at timestamptz, paid_at timestamptz,
  primary key (client_service_id, period)
);

-- Vault: portal logins grouped by entity. Bank logins are LINK-OUTS only —
-- is_bank=true rows carry no secret and just point staff to TAP Bank.
create table credentials (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,  -- null => firm-wide
  group_label text,                       -- shown when client_id is null, e.g. 'Firm-wide'
  portal      text not null,              -- Toast, ADP, TX Comptroller, EFTPS...
  username    text,
  vault_ref   text,                       -- pointer to 1Password/Bitwarden item
  is_bank     boolean not null default false,
  link_url    text,                       -- for bank link-outs
  notes       text
  -- NOTE: never store the actual password here. Bank logins stay in TAP Bank.
);

create table audit_log (                   -- who changed what, when
  id       bigserial primary key,
  actor    uuid references profiles(id),
  action   text, entity text, entity_id text,
  detail   jsonb,
  at       timestamptz not null default now()
);

-- ---------- 4. Row-Level Security -----------------------------------
alter table profiles               enable row level security;
alter table clients                enable row level security;
alter table contacts               enable row level security;
alter table services               enable row level security;
alter table client_services        enable row level security;
alter table work_periods           enable row level security;
alter table period_counts          enable row level security;
alter table time_entries           enable row level security;
alter table client_tax_ids         enable row level security;
alter table client_service_billing enable row level security;
alter table billing_periods        enable row level security;
alter table credentials            enable row level security;
alter table audit_log              enable row level security;

-- Profiles: see your own; admins see/manage all.
create policy profiles_self_read   on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for all    using (is_admin()) with check (is_admin());

-- Core operational tables: any signed-in user may READ.
create policy read_clients  on clients         for select using (auth.uid() is not null);
create policy read_contacts on contacts        for select using (auth.uid() is not null);
create policy read_services on services        for select using (auth.uid() is not null);
create policy read_cs       on client_services for select using (auth.uid() is not null);
create policy read_wp       on work_periods    for select using (auth.uid() is not null);
create policy read_pc       on period_counts   for select using (auth.uid() is not null);

-- Operational writes: admin / manager / staff may add & edit.
create policy write_clients  on clients         for all
  using (auth_role() in ('admin','manager','staff')) with check (auth_role() in ('admin','manager','staff'));
create policy write_contacts on contacts        for all
  using (auth_role() in ('admin','manager','staff')) with check (auth_role() in ('admin','manager','staff'));
create policy write_cs       on client_services for all
  using (auth_role() in ('admin','manager','staff')) with check (auth_role() in ('admin','manager','staff'));

-- Work status (stage): staff edit freely; OFFSHORE updates only THEIR assigned rows.
create policy write_wp_staff    on work_periods for all
  using (auth_role() in ('admin','manager','staff')) with check (auth_role() in ('admin','manager','staff'));
create policy write_wp_offshore on work_periods for update
  using (auth_role() = 'offshore' and exists (
    select 1 from client_services cs
    where cs.id = work_periods.client_service_id and cs.assigned_to = auth.uid()))
  with check (true);

-- Counts (payroll / 1099): same rule as stage work.
create policy write_pc_staff    on period_counts for all
  using (auth_role() in ('admin','manager','staff')) with check (auth_role() in ('admin','manager','staff'));
create policy write_pc_offshore on period_counts for update
  using (auth_role() = 'offshore' and exists (
    select 1 from client_services cs
    where cs.id = period_counts.client_service_id and cs.assigned_to = auth.uid()))
  with check (true);

-- Timesheet: everyone manages THEIR OWN entries; privileged can read all.
create policy time_own        on time_entries for all
  using (who = auth.uid()) with check (who = auth.uid());
create policy time_priv_read  on time_entries for select using (is_privileged());

-- Service catalog: admin only.
create policy write_services on services for all using (is_admin()) with check (is_admin());

-- SENSITIVE tables: privileged (admin/manager) only — read AND write.
-- (Billing is admin/owner territory in practice; managers included to match v1.)
create policy priv_taxids    on client_tax_ids         for all using (is_privileged()) with check (is_privileged());
create policy priv_csbilling on client_service_billing for all using (is_privileged()) with check (is_privileged());
create policy priv_billper   on billing_periods        for all using (is_privileged()) with check (is_privileged());
create policy priv_creds     on credentials            for all using (is_privileged()) with check (is_privileged());

-- Audit log: privileged can read; any signed-in user may append.
create policy audit_read   on audit_log for select using (is_privileged());
create policy audit_insert on audit_log for insert with check (auth.uid() is not null);

-- ---------- 5. Seed the service catalog ----------------------------
insert into services (code, name, tracking) values
  ('FIN','Monthly Financials','stage'),
  ('PR','Payroll','count'),                 -- runs counted per month
  ('STX','Sales Tax','stage'),
  ('T9','1099s','count'),                    -- forms counted per month
  ('REND','Renditions','stage'),
  ('TAX','Tax Return','stage'),
  ('RENEWAL','State Renewal','stage')
on conflict (code) do nothing;

-- ---------- 6. Views the app reads ---------------------------------
-- security_invoker = on -> the view respects the caller's RLS, so
-- non-privileged users still can't reach sensitive tables through it.
-- NOTE: no fee/amount column here — billing never enters the worklists.
create view v_worklist with (security_invoker = on) as
  select cs.id, s.code as service, s.tracking, c.name as client, c.type,
         p.full_name as assigned_to, cs.frequency, cs.active
  from client_services cs
  join clients  c on c.id = cs.client_id
  join services s on s.id = cs.service_id
  left join profiles p on p.id = cs.assigned_to
  where cs.active;

-- Convenience: pick a year by filtering on the period prefix, e.g.
--   select * from work_periods  where left(period,4) = '2025';
--   select * from period_counts where left(period,4) = '2025';
-- This is how the worklists show prior-year history.

-- =====================================================================
-- HARDENING CHECKLIST (configure in the host/dashboard, not SQL)
--   [ ] Auth: email + password for the ~10 users; require email confirm.
--   [ ] Provisioning: invite link -> user sets their own password (we store none).
--   [ ] Enable MFA (TOTP) for EVERY account — mandatory for the offshore door.
--   [ ] Offshore "web door": TLS + IP allow-list to the India office only.
--   [ ] Enable leaked-password protection.
--   [ ] NEVER expose a privileged DB key to the browser (server-side only).
--   [ ] Keep RLS enabled on every table. New table = new policies.
--   [ ] Point-in-time recovery / verified daily backups (on-prem too).
--   [ ] Store any real secret in a vault, not plain columns.
--   [ ] After creating each login, insert their profiles row with the right
--       role ('admin' | 'manager' | 'staff' | 'offshore'), manager, and modules.
-- =====================================================================
