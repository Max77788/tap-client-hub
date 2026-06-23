-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/phgogybfgovrlcdmifpv/sql/new

ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bank_routing text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS group_assigned_to text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sales_tax_rt text;
