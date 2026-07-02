-- 004_redesign_columns.sql
-- Add columns for the 7/2 redesign: Payroll bi-weekly code, pay start date,
-- Tax return filing fields, and universal comments system.

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS biweekly_code TEXT DEFAULT NULL;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS pay_start_date TEXT DEFAULT NULL;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS filing_state TEXT DEFAULT NULL;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS filing_month TEXT DEFAULT NULL;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS filing_type TEXT DEFAULT NULL;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS pay_emails TEXT[] DEFAULT NULL;
