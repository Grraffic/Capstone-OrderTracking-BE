-- ============================================================================
-- MIGRATION: Cleanup Duplicate Student Records
-- ============================================================================
-- Purpose: Identify and merge duplicate student records with the same email,
--          keeping the oldest record and migrating related data.
--
-- This migration:
-- 1. Identifies duplicate student records by email (case-insensitive)
-- 2. Keeps the oldest record (by created_at) as the primary record
-- 3. Migrates foreign key references from duplicates to the primary record
-- 4. Deletes duplicate records
--
-- WARNING: Run this BEFORE add_unique_email_constraint_students.sql
-- ============================================================================

-- Step 1: Create a temporary table to identify duplicates and their primary records
CREATE TEMP TABLE IF NOT EXISTS duplicate_students_cleanup AS
WITH normalized_emails AS (
  SELECT 
    id,
    user_id,
    email,
    LOWER(TRIM(email)) AS normalized_email,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email)) 
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM students
  WHERE email IS NOT NULL
),
duplicates AS (
  SELECT 
    id AS duplicate_id,
    user_id AS duplicate_user_id,
    normalized_email,
    (SELECT id FROM normalized_emails ne2 
     WHERE ne2.normalized_email = ne1.normalized_email 
     AND ne2.rn = 1) AS primary_id,
    (SELECT user_id FROM normalized_emails ne2 
     WHERE ne2.normalized_email = ne1.normalized_email 
     AND ne2.rn = 1) AS primary_user_id
  FROM normalized_emails ne1
  WHERE rn > 1
)
SELECT * FROM duplicates;

-- Step 2: Log the duplicates found (for review)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count FROM duplicate_students_cleanup;
  RAISE NOTICE 'Found % duplicate student records to merge', duplicate_count;
END $$;

-- Step 3: Update orders.student_id to point to primary student record
UPDATE orders o
SET student_id = (
  SELECT primary_id 
  FROM duplicate_students_cleanup d 
  WHERE d.duplicate_id = o.student_id
)
WHERE EXISTS (
  SELECT 1 
  FROM duplicate_students_cleanup d 
  WHERE d.duplicate_id = o.student_id
);

-- Step 4: Update cart_items.student_id to point to primary student record
UPDATE cart_items ci
SET student_id = (
  SELECT primary_id 
  FROM duplicate_students_cleanup d 
  WHERE d.duplicate_id = ci.student_id
)
WHERE EXISTS (
  SELECT 1 
  FROM duplicate_students_cleanup d 
  WHERE d.duplicate_id = ci.student_id
);

-- Step 5: Handle any other tables that might reference students.id
-- (Add more UPDATE statements here if there are other foreign key references)

-- Step 6: Delete duplicate student records
-- Note: This will fail if there are other foreign key constraints we haven't handled
DELETE FROM students
WHERE id IN (
  SELECT duplicate_id FROM duplicate_students_cleanup
);

-- Step 7: Verify cleanup - check for remaining duplicates
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT LOWER(TRIM(email)) AS normalized_email, COUNT(*) AS cnt
    FROM students
    WHERE email IS NOT NULL
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) dup_check;
  
  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'Warning: % duplicate email groups still exist after cleanup', remaining_duplicates;
  ELSE
    RAISE NOTICE 'Success: No duplicate emails found after cleanup';
  END IF;
END $$;

-- Step 8: Clean up temporary table
DROP TABLE IF EXISTS duplicate_students_cleanup;

-- ============================================================================
-- Notes:
-- 1. This migration is idempotent - safe to run multiple times
-- 2. If foreign key constraints prevent deletion, you'll need to identify
--    and update those tables first
-- 3. Review the RAISE NOTICE messages to see how many duplicates were found
-- 4. After running this, you can safely apply add_unique_email_constraint_students.sql
-- ============================================================================
