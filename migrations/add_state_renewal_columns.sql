-- Add state renewal columns to client_services
-- Run in Supabase SQL Editor, schema: tap_hub_project

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS state_renewal boolean DEFAULT false;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS renewal_state text;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS renewal_due_month text;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS renewal_due_day text;

ALTER TABLE tap_hub_project.client_services 
  ADD COLUMN IF NOT EXISTS renewal_identifiers text;
