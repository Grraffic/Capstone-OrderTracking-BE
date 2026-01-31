-- ============================================================================
-- Migration: Update Education Level Constraint in Students Table
-- ============================================================================
-- Purpose: Fix constraint to allow "Junior High School" instead of just "High School"
--          to match the rest of the system (eligibility table, items table, etc.)
--
-- Issue: Frontend returns "Junior High School" for Grades 7-10, but database
--        constraint only allows "High School", causing 500 errors
-- ============================================================================

-- Step 1: Update existing "High School" records to "Junior High School" for consistency
-- (Optional - only if you want to standardize existing data)
UPDATE students
SET education_level = 'Junior High School'
WHERE education_level = 'High School';

-- Step 2: Drop the old constraint
ALTER TABLE students
DROP CONSTRAINT IF EXISTS check_students_education_level;

-- Step 3: Add updated constraint with "Junior High School" instead of "High School"
ALTER TABLE students
ADD CONSTRAINT check_students_education_level 
CHECK (education_level IS NULL OR education_level IN (
  'Kindergarten', 
  'Elementary', 
  'Junior High School',  -- Changed from 'High School' to 'Junior High School'
  'Senior High School', 
  'College', 
  'Vocational'
));

-- Step 4: Verify the constraint was updated
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'students' 
  AND con.conname = 'check_students_education_level';

-- ============================================================================
-- Note: This migration ensures consistency across the system:
-- - Students table: "Junior High School"
-- - Eligibility table: "Junior High School"
-- - Items table: "Junior High School"
-- - Frontend: "Junior High School"
-- ============================================================================
