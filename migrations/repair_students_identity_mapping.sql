-- Repair students identity/status fields for Is Active toggle.
-- Safe to run multiple times and across mixed schemas.

-- 1) Normalize student emails to lowercase for consistent lookup.
UPDATE students
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

-- 2) If status column exists, ensure non-null.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'status'
  ) THEN
    UPDATE students
    SET status = 'active'
    WHERE status IS NULL OR btrim(status) = '';
  END IF;
END $$;

-- 3) If is_active column exists, ensure non-null.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'students'
      AND column_name = 'is_active'
  ) THEN
    UPDATE students
    SET is_active = true
    WHERE is_active IS NULL;
  END IF;
END $$;

