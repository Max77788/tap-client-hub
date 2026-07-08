-- Schema backup of tap_hub_project
-- 20260708_144626

CREATE TABLE tap_hub_project.audit_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id text NULL,
  action text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  changes jsonb NULL,
  performed_by text NULL,
  performed_at timestamp with time zone DEFAULT now() NULL,
  created_at timestamp with time zone DEFAULT now() NULL
);

CREATE TABLE tap_hub_project.billing_periods (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id text NULL,
  period_start date NULL,
  period_end date NULL,
  status text DEFAULT 'pending'::text NULL,
  amount numeric NULL,
  notes text NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  updated_at timestamp with time zone DEFAULT now() NULL
);

CREATE TABLE tap_hub_project.client_services (
  id text NOT NULL,
  client_id text NULL,
  service_id text NULL,
  assigned_to text NULL,
  active boolean DEFAULT true NULL,
  frequency text DEFAULT 'Monthly'::text NULL,
  processor text NULL,
  software text NULL,
  started_on text NULL,
  ended_on text NULL,
  notes text NULL,
  expected_annual numeric NULL,
  financials_month integer DEFAULT 0 NULL,
  eftps text NULL,
  payroll_password text NULL,
  paydate text NULL,
  sales_tax_line_items jsonb DEFAULT '[]'::jsonb NULL,
  biweekly_code text NULL,
  pay_start_date text NULL,
  filing_state text NULL,
  filing_month text NULL,
  filing_type text NULL,
  comments jsonb DEFAULT '[]'::jsonb NULL,
  pay_emails jsonb DEFAULT '[]'::jsonb NULL,
  reporting_notes text NULL
);

CREATE TABLE tap_hub_project.client_tax_ids (
  client_id text NULL,
  ein text NULL,
  ssn_last4 text NULL
);

CREATE TABLE tap_hub_project.clients (
  id text NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'Business'::text NULL,
  entity_type text NULL,
  group_owner text NULL,
  status text DEFAULT 'active'::text NULL,
  city text NULL,
  state text NULL,
  zip text NULL,
  address text NULL,
  notes text NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  updated_at timestamp with time zone DEFAULT now() NULL,
  cid text NULL
);

CREATE TABLE tap_hub_project.contacts (
  id text NOT NULL,
  client_id text NULL,
  name text NULL,
  email text NULL,
  phone text NULL,
  is_primary boolean DEFAULT false NULL
);

CREATE TABLE tap_hub_project.credentials (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_id text NULL,
  portal text NULL,
  username text NULL,
  vault_ref text NULL,
  notes text NULL,
  group_label text NULL,
  is_bank boolean DEFAULT false NULL,
  link_url text NULL,
  purpose text NULL,
  additional_info_01 text NULL,
  additional_info_02 text NULL,
  entity_name text NULL,
  category text NULL,
  service_type text NULL,
  ip_restrictions text NULL,
  created_by text NULL,
  client_name text NULL,
  portal_url text NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  updated_at timestamp with time zone DEFAULT now() NULL
);

CREATE TABLE tap_hub_project.period_counts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  client_service_id uuid NOT NULL,
  period text NOT NULL,
  processed integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  updated_at timestamp with time zone DEFAULT now() NULL
);

CREATE TABLE tap_hub_project.profiles (
  id text NOT NULL,
  full_name text NULL,
  role text DEFAULT 'staff'::text NULL,
  location text NULL,
  active boolean DEFAULT true NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  org_id text NULL,
  user_id text NULL,
  avatar_url text NULL,
  reporting_manager text NULL,
  modules jsonb DEFAULT '[]'::jsonb NULL,
  invite_status text NULL,
  invited_at timestamp with time zone NULL,
  last_login_at timestamp with time zone NULL,
  totp_secret text NULL,
  totp_enabled boolean DEFAULT false NULL,
  email_2fa_enabled boolean DEFAULT false NULL,
  email_2fa_code text NULL,
  email_2fa_code_expires_at timestamp with time zone NULL
);

CREATE TABLE tap_hub_project.services (
  id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  active boolean DEFAULT true NULL,
  tracking text DEFAULT 'monthly'::text NULL
);

CREATE TABLE tap_hub_project.time_entries (
  id text NOT NULL,
  who text NULL,
  client_id text NULL,
  client_service_id text NULL,
  task text NULL,
  started_at timestamp with time zone NULL,
  seconds integer DEFAULT 0 NULL,
  note text NULL,
  edited boolean DEFAULT false NULL,
  edited_by text NULL,
  edited_at timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now() NULL,
  company text NULL,
  manual boolean DEFAULT false NULL
);

CREATE TABLE tap_hub_project.work_periods (
  id text DEFAULT gen_random_uuid() NOT NULL,
  client_service_id text NULL,
  period text NOT NULL,
  stage text DEFAULT 'not_started'::text NULL,
  done_by text NULL,
  done_at timestamp with time zone NULL,
  billed_at timestamp with time zone NULL,
  paid_at timestamp with time zone NULL,
  notes text NULL
);
