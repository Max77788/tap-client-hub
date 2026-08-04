-- TAP Lens Collections v1. Additive migration for tap_hub_project.
-- Requires the existing TAP Client Hub foundation schema.

create table if not exists tap_hub_project.lens_invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references tap_hub_project.clients(id) on delete set null,
  client_service_id uuid references tap_hub_project.client_services(id) on delete set null,
  qb_invoice_id text unique,
  invoice_number text,
  invoice_date date,
  due_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance numeric(12,2) generated always as (amount - amount_paid) stored,
  status text not null default 'open' check (status in ('open','partial','paid','void','hold')),
  source text not null default 'manual' check (source in ('manual','quickbooks')),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tap_hub_project.lens_collection_ladder (
  rung smallint primary key check (rung between 1 and 5),
  label text not null,
  trigger_days smallint not null check (trigger_days >= 0),
  auto_send boolean not null default true,
  channel text not null default 'email',
  subject text,
  body text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists tap_hub_project.lens_collection_activity (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references tap_hub_project.lens_invoices(id) on delete cascade,
  action text not null check (action in ('sent','skipped','approved','escalated','paused','replied','paid','hold')),
  rung smallint check (rung between 1 and 5),
  channel text,
  detail jsonb not null default '{}'::jsonb,
  actor uuid references tap_hub_project.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists tap_hub_project.lens_collection_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_lens_invoices_open_due
  on tap_hub_project.lens_invoices (due_date)
  where status in ('open', 'partial');
create index if not exists idx_lens_invoices_client on tap_hub_project.lens_invoices (client_id);
create index if not exists idx_lens_activity_invoice_created on tap_hub_project.lens_collection_activity (invoice_id, created_at desc);

insert into tap_hub_project.lens_collection_ladder (rung, label, trigger_days, auto_send, subject, body) values
  (1, 'Friendly reminder', 10, true, 'A friendly reminder from TAP Associates', 'Hello {{client_name}},\n\nThis is a friendly reminder that invoice {{invoice_number}} has an outstanding balance of {{balance}}. Please let us know if you need anything.\n\nThank you,\nTAP Associates'),
  (2, 'Professional notice', 20, true, 'Outstanding invoice {{invoice_number}}', 'Hello {{client_name}},\n\nInvoice {{invoice_number}} remains outstanding at {{balance}}. Please arrange payment or contact us with any questions.\n\nThank you,\nTAP Associates'),
  (3, 'Formal demand', 30, true, 'Action needed: invoice {{invoice_number}}', 'Hello {{client_name}},\n\nPlease address the outstanding balance of {{balance}} on invoice {{invoice_number}}. Contact us today if there is a question or payment plan needed.\n\nTAP Associates'),
  (4, 'Owner escalation', 31, false, 'Owner follow-up required: invoice {{invoice_number}}', 'Internal step. Owner approval is required before contact.'),
  (5, 'Formal letter', 45, false, 'Formal notice: invoice {{invoice_number}}', 'Internal step. Owner approval is required before a formal letter is sent.')
on conflict (rung) do nothing;

insert into tap_hub_project.lens_collection_settings (key, value) values
  ('guardrails', '{"min_balance":50,"send_window":"09:00-17:00","skip_weekends":true,"stop_on_payment":true,"escalate_over":5000}'::jsonb),
  ('routing', '{"from_name":"TAP Associates","reply_to":"","cc_assignee":true,"escalate_to":"Owner"}'::jsonb)
on conflict (key) do nothing;
