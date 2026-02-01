-- ============================================================================
-- VERIFICATION SCRIPT: Student Item Permissions Table
-- ============================================================================
-- Run this script to verify the student_item_permissions table exists and has the correct structure
-- Execute in Supabase SQL Editor after running the migration
-- ============================================================================

-- ============================================================================
-- 1. CHECK IF TABLE EXISTS
-- ============================================================================
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'student_item_permissions'
) AS table_exists;

-- ============================================================================
-- 2. CHECK TABLE STRUCTURE
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_item_permissions'
ORDER BY ordinal_position;

-- Expected columns:
-- - id (uuid, NOT NULL, uuid_generate_v4())
-- - student_id (uuid, NOT NULL)
-- - item_name (text, NOT NULL)
-- - enabled (boolean, NOT NULL, true)
-- - quantity (integer, NULL)
-- - created_at (timestamp with time zone, NOT NULL, now())
-- - updated_at (timestamp with time zone, NOT NULL, now())

-- ============================================================================
-- 3. CHECK INDEXES
-- ============================================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'student_item_permissions'
ORDER BY indexname;

-- Expected indexes:
-- - student_item_permissions_pkey (PRIMARY KEY on id)
-- - idx_student_item_permissions_student_id
-- - idx_student_item_permissions_item_name
-- - idx_student_item_permissions_enabled
-- - idx_student_item_permissions_student_item

-- ============================================================================
-- 4. CHECK CONSTRAINTS
-- ============================================================================
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.student_item_permissions'::regclass
ORDER BY conname;

-- Expected constraints:
-- - student_item_permissions_pkey (PRIMARY KEY)
-- - unique_student_item_permission (UNIQUE on student_id, item_name)
-- - check_student_item_permissions_quantity (CHECK quantity > 0 or NULL)
-- - student_item_permissions_student_id_fkey (FOREIGN KEY to students(id))

-- ============================================================================
-- 5. CHECK FOREIGN KEY RELATIONSHIP
-- ============================================================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'student_item_permissions';

-- Expected: student_id -> students(id)

-- ============================================================================
-- 6. CHECK TRIGGER
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement AS action
FROM information_schema.triggers
WHERE event_object_table = 'student_item_permissions';

-- Expected: trigger_update_student_item_permissions_updated_at (BEFORE UPDATE)

-- ============================================================================
-- 7. COUNT EXISTING RECORDS (if any)
-- ============================================================================
SELECT COUNT(*) AS total_permissions FROM student_item_permissions;

-- ============================================================================
-- 8. TEST INSERT (Optional - uncomment to test)
-- ============================================================================
-- First, get a valid student ID:
-- SELECT id FROM students LIMIT 1;

-- Then test insert (replace STUDENT_ID_HERE with actual student ID):
/*
INSERT INTO student_item_permissions (student_id, item_name, enabled, quantity)
VALUES (
  'STUDENT_ID_HERE'::uuid,
  'jogging pants',
  true,
  2
)
ON CONFLICT (student_id, item_name) 
DO UPDATE SET 
  enabled = EXCLUDED.enabled,
  quantity = EXCLUDED.quantity,
  updated_at = NOW()
RETURNING *;
*/

-- ============================================================================
-- 9. TEST QUERY (Optional - uncomment to test)
-- ============================================================================
-- Query permissions for a specific student (replace STUDENT_ID_HERE):
/*
SELECT 
  id,
  student_id,
  item_name,
  enabled,
  quantity,
  created_at,
  updated_at
FROM student_item_permissions
WHERE student_id = 'STUDENT_ID_HERE'::uuid
ORDER BY item_name;
*/

-- ============================================================================
-- 10. VERIFY QUANTITY COLUMN EXISTS
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'student_item_permissions'
  AND column_name = 'quantity';

-- Expected: quantity (integer, nullable)

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If all checks pass:
-- ✅ Table exists
-- ✅ All columns present (including quantity)
-- ✅ Foreign key references students(id)
-- ✅ Indexes created
-- ✅ Constraints in place
-- ✅ Trigger exists
-- 
-- If any check fails, review the migration and run it again.
-- ============================================================================
