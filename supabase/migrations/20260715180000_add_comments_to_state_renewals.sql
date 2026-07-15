-- Add comments column to state_renewals for per-item notes
ALTER TABLE tap_hub_project.state_renewals ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tap_hub_project.state_renewals.comments IS 'Per-state-renewal-item comment entries [{id, month, text, author, createdAt}]';
