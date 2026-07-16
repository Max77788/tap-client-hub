-- Prevent duplicate monthly stage rows and make POST /api/work-periods atomic.
BEGIN;

LOCK TABLE tap_hub_project.work_periods IN ACCESS EXCLUSIVE MODE;

-- The table has no timestamps or primary key. ctid order reflects insertion order,
-- so retain the most recently inserted value for each service/month pair.
DELETE FROM tap_hub_project.work_periods older
USING tap_hub_project.work_periods newer
WHERE older.client_service_id = newer.client_service_id
  AND older.period = newer.period
  AND older.ctid < newer.ctid;

-- Use a table constraint rather than a standalone unique index so every
-- supported PostgREST version can resolve on_conflict=client_service_id,period.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'tap_hub_project.work_periods'::regclass
      AND conname = 'work_periods_client_service_period_unique'
  ) THEN
    DROP INDEX IF EXISTS tap_hub_project.work_periods_client_service_period_uidx;
    ALTER TABLE tap_hub_project.work_periods
      ADD CONSTRAINT work_periods_client_service_period_unique
      UNIQUE (client_service_id, period);
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
