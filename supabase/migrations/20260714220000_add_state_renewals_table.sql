-- State Renewals: child table for multi-state annual report line items
CREATE TABLE IF NOT EXISTS tap_hub_project.state_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id TEXT NOT NULL REFERENCES tap_hub_project.client_services(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'TX',
  due_month TEXT,
  due_day TEXT,
  identifiers TEXT,
  assigned_to TEXT,
  frequency TEXT DEFAULT 'Yearly',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_renewals_cs_id ON tap_hub_project.state_renewals(client_service_id);

-- Migrate existing single state renewal data into the new table
INSERT INTO tap_hub_project.state_renewals (client_service_id, state, due_month, due_day, identifiers)
SELECT 
  id AS client_service_id,
  renewal_state AS state,
  renewal_due_month::text AS due_month,
  renewal_due_day::text AS due_day,
  renewal_identifiers AS identifiers
FROM tap_hub_project.client_services
WHERE service_id = (SELECT id FROM tap_hub_project.services WHERE code = 'REND' AND active = true)
  AND state_renewal = true
  AND renewal_state IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tap_hub_project.state_renewals sr 
    WHERE sr.client_service_id = tap_hub_project.client_services.id
  );
