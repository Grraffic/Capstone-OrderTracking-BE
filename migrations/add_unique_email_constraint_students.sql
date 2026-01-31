-- ============================================================================
-- MIGRATION: Add Unique Email Constraint to Students Table
-- ============================================================================
-- Purpose: Prevent duplicate student accounts by enforcing case-insensitive
--          unique constraint on email column.
-- 
-- This migration:
-- 1. Identifies and handles existing duplicate emails (if any)
-- 2. Adds a case-insensitive unique constraint on email
-- 3. Ensures all future inserts/updates respect email uniqueness
-- ============================================================================

-- Step 1: Normalize all emails to lowercase (if not already normalized)
UPDATE students
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL AND email <> LOWER(TRIM(email));

-- Step 2: Check for duplicates before creating unique constraint
-- If duplicates exist, this will fail with a clear error message
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT LOWER(TRIM(email)) AS normalized_email, COUNT(*) AS cnt
    FROM students
    WHERE email IS NOT NULL
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) dup_check;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot add unique constraint: % duplicate email groups found. Please run cleanup_duplicate_students.sql first.', duplicate_count;
  END IF;
END $$;

-- Step 3: Create a unique index on lowercase email
-- This enforces case-insensitive uniqueness
-- Note: PostgreSQL unique indexes are case-sensitive by default,
-- so we use LOWER(email) to make it case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_unique_lower
ON students(LOWER(TRIM(email)))
WHERE email IS NOT NULL;

-- Step 4: Add a comment for documentation
COMMENT ON INDEX idx_students_email_unique_lower IS 
'Case-insensitive unique constraint on students.email to prevent duplicate accounts';

-- ============================================================================
-- IMPORTANT: Run cleanup_duplicate_students.sql BEFORE this migration
-- This migration will fail if duplicates still exist, preventing data corruption
-- ============================================================================
