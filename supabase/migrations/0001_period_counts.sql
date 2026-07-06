CREATE TABLE IF NOT EXISTS tap_hub_project.period_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_service_id UUID NOT NULL,
  period TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_service_id, period)
);

ALTER TABLE tap_hub_project.period_counts 
  ADD CONSTRAINT fk_period_counts_client_service 
  FOREIGN KEY (client_service_id) 
  REFERENCES tap_hub_project.client_services(id) 
  ON DELETE CASCADE;

ALTER TABLE tap_hub_project.period_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON tap_hub_project.period_counts FOR ALL USING (true) WITH CHECK (true);
