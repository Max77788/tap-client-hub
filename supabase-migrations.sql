-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/phgogybfgovrlcdmifpv/sql/new

-- Required table for service status tracking
CREATE TABLE IF NOT EXISTS work_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id uuid REFERENCES client_services(id) ON DELETE CASCADE,
  period text NOT NULL,
  stage text DEFAULT 'not_started',
  done_by text,
  done_at timestamptz,
  UNIQUE(client_service_id, period)
);

-- Sales Tax fields on client_services
ALTER TABLE client_services 
  ADD COLUMN IF NOT EXISTS sales_tax_notes TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_routing TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS group_assigned_to TEXT,
  ADD COLUMN IF NOT EXISTS sales_tax_rt TEXT;

-- Payroll fields on client_services
ALTER TABLE client_services 
  ADD COLUMN IF NOT EXISTS cdg TEXT,
  ADD COLUMN IF NOT EXISTS eftps TEXT,
  ADD COLUMN IF NOT EXISTS payroll_password TEXT,
  ADD COLUMN IF NOT EXISTS paydate TEXT;
