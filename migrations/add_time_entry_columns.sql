-- Add company and manual columns to time_entries (if they don't exist)
ALTER TABLE tap_hub_project.time_entries ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE tap_hub_project.time_entries ADD COLUMN IF NOT EXISTS manual boolean NOT NULL DEFAULT false;
