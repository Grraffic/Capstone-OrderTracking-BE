-- Backfill student account status for legacy rows that may have null/blank values.
UPDATE students
SET status = 'active'
WHERE status IS NULL OR btrim(status) = '';
