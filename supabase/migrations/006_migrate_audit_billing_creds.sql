-- Migrate audit_log, billing_periods, credentials from old project (phgogybfgovrlcdmifpv)
-- → new project (rqxscydyvrvbdkqagemy) under tap_hub_project schema
-- Run in SQL Editor: https://supabase.com/dashboard/project/rqxscydyvrvbdkqagemy/sql/new

BEGIN;

-- ── audit_log ──
DROP TABLE IF EXISTS tap_hub_project.audit_log CASCADE;
CREATE TABLE tap_hub_project.audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES tap_hub_project.clients(id),
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    changes jsonb,
    performed_by text,
    performed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- ── billing_periods ──
DROP TABLE IF EXISTS tap_hub_project.billing_periods CASCADE;
CREATE TABLE tap_hub_project.billing_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES tap_hub_project.clients(id),
    period_start date,
    period_end date,
    status text DEFAULT 'pending',
    amount numeric,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ── credentials ──
DROP TABLE IF EXISTS tap_hub_project.credentials CASCADE;
CREATE TABLE tap_hub_project.credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid REFERENCES tap_hub_project.clients(id),
    portal text,
    username text,
    vault_ref text,
    notes text,
    group_label text,
    is_bank boolean DEFAULT false,
    link_url text,
    purpose text,
    additional_info_01 text,
    additional_info_02 text,
    entity_name text,
    category text,
    service_type text,
    ip_restrictions text,
    created_by text,
    client_name text,
    portal_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMIT;
