-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/rqxscydyvrvbdkqagemy/sql/new
ALTER TABLE service_comments ADD COLUMN IF NOT EXISTS stx_item_idx INTEGER;
