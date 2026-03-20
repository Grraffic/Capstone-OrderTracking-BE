-- Verify student status toggle lookup mappings.

-- 1) Check whether target student exists by email.
SELECT *
FROM students
WHERE lower(email) = 'ivanaisabel.santiago@student.laverdad.edu.ph';

-- 2) Check whether incoming failing ID exists in any lookup field.
SELECT *
FROM students
WHERE id = 'beec7b79-1fa5-4c10-84d6-fd691f45381b'
   OR user_id = 'beec7b79-1fa5-4c10-84d6-fd691f45381b';

-- 3) Optional bridge check for older schemas where users table still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'users table exists - bridge queries are applicable';
  ELSE
    RAISE NOTICE 'users table does not exist - skip bridge checks';
  END IF;
END $$;

-- 4) Check students with null/blank email or missing user_id.
SELECT id, email, user_id
FROM students
WHERE email IS NULL
   OR btrim(email) = ''
   OR user_id IS NULL
ORDER BY created_at DESC
LIMIT 100;

