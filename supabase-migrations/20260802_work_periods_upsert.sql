-- Sales Tax worklist status persistence
-- `POST /api/work-periods` upserts on this key. The live table was created
-- without the required uniqueness constraint, causing PostgREST upserts to fail.

CREATE UNIQUE INDEX IF NOT EXISTS work_periods_client_service_period_key
  ON tap_hub_project.work_periods (client_service_id, period);
