-- Drop payroll-specific metadata columns from client_services
-- Run this in Supabase Dashboard → SQL Editor (https://rqxscydyvrvbdkqagemy.supabase.co)

ALTER TABLE tap_hub_project.client_services 
  DROP COLUMN IF EXISTS pay_period_frequency,
  DROP COLUMN IF EXISTS reporting_method,
  DROP COLUMN IF EXISTS payroll_category,
  DROP COLUMN IF EXISTS qb_license;
