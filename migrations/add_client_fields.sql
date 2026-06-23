-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/phgogybfgovrlcdmifpv/sql/new
--
-- Adds Sales Tax service-specific fields to the client_services table.
-- These fields are only relevant when the service code is 'STX' (sales_tax).

ALTER TABLE client_services ADD COLUMN IF NOT EXISTS sales_tax_notes text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS bank_routing text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS group_assigned_to text;
ALTER TABLE client_services ADD COLUMN IF NOT EXISTS sales_tax_rt text;
