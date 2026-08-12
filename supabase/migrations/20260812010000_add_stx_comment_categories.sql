BEGIN;

ALTER TABLE tap_hub_project.comments
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Other';

ALTER TABLE tap_hub_project.comments
  DROP CONSTRAINT IF EXISTS comments_category_check;

ALTER TABLE tap_hub_project.comments
  ADD CONSTRAINT comments_category_check
  CHECK (category IN ('Delayed', 'Waiting on client', 'Issues', 'Other'));

NOTIFY pgrst, 'reload schema';

COMMIT;
