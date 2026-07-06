-- Run this in Supabase SQL Editor for project rqxscydyvrvbdkqagemy:
-- 1. Go to https://supabase.com/dashboard/project/rqxscydyvrvbdkqagemy/sql/new
-- 2. Paste and run

-- Add cid (Client ID) column to clients table
ALTER TABLE tap_hub_project.clients 
  ADD COLUMN IF NOT EXISTS cid TEXT;

-- Verify it was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'tap_hub_project' 
  AND table_name = 'clients' 
  AND column_name = 'cid';
