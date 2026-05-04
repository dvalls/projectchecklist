ALTER TABLE cl_form_templates
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Initialize positions from created_at order within each project (ascending),
-- so the first-created template gets position 0, second gets 1, etc.
-- Templates with no project (library templates) are grouped separately.
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY COALESCE(project_id::text, '__lib__')
      ORDER BY created_at ASC
    ) - 1)::integer AS rn
  FROM cl_form_templates
)
UPDATE cl_form_templates t
SET position = r.rn
FROM ranked r
WHERE t.id = r.id;
