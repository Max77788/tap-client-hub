ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_at TIMESTAMPTZ;
ALTER TABLE tap_hub_project.clients ADD COLUMN IF NOT EXISTS active_updated_by TEXT;

COMMENT ON COLUMN tap_hub_project.clients.active IS 'Whether the client is active (true) or archived/inactive (false)';
COMMENT ON COLUMN tap_hub_project.clients.active_updated_at IS 'Timestamp of last active status change';
COMMENT ON COLUMN tap_hub_project.clients.active_updated_by IS 'Name of user who last changed the active status';
