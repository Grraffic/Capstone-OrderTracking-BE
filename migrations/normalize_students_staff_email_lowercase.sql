-- Normalize students and staff email to lowercase so lookups by normalized email find the same row.
-- Prevents duplicate accounts when the same user logs in with different email casing (e.g. from Google).
-- Run once; safe to re-run (idempotent).

UPDATE students
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL AND email <> LOWER(TRIM(email));

UPDATE staff
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL AND email <> LOWER(TRIM(email));
