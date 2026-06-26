-- Add financials_month column to client_services
ALTER TABLE tap_hub_project.client_services ADD COLUMN IF NOT EXISTS financials_month int;
