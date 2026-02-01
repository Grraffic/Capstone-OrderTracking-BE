-- ============================================================================
-- MIGRATION: Create Student Item Permissions Table (Complete)
-- ============================================================================
-- Date: 2025-01-XX
-- Description: Creates a complete table to store manual ordering permissions for students
--              System admins can grant permissions to students for specific items
--              Includes quantity column for custom max quantities per item per student
--              Foreign key references students(id) since that's where student data is stored
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STUDENT_ITEM_PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_item_permissions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key to students table (student)
  -- Note: References students(id) since that's where student data is stored
  -- The students table has user_id that links to users(id) for authentication
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Normalized item name (e.g., "Polo Shirt", "Logo Patch", "Jogging Pants")
  -- This allows permissions to apply to all size variants of the same item
  item_name TEXT NOT NULL,
  
  -- Whether the student can order this item
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Custom max quantity for this item for this student
  -- NULL means use default from itemMaxOrder config
  -- If set, this overrides the default max quantity
  quantity INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: a student can only have one permission record per item name
  CONSTRAINT unique_student_item_permission UNIQUE (student_id, item_name),
  
  -- Check constraint for quantity (must be positive if set)
  CONSTRAINT check_student_item_permissions_quantity
    CHECK (quantity IS NULL OR quantity > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_student_item_permissions_student_id 
  ON student_item_permissions(student_id);

CREATE INDEX IF NOT EXISTS idx_student_item_permissions_item_name 
  ON student_item_permissions(item_name);

CREATE INDEX IF NOT EXISTS idx_student_item_permissions_enabled 
  ON student_item_permissions(enabled);

CREATE INDEX IF NOT EXISTS idx_student_item_permissions_student_item 
  ON student_item_permissions(student_id, item_name);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE student_item_permissions IS 
  'Stores manual ordering permissions for students. System admins can grant permissions to allow students to order specific items that are normally restricted.';

COMMENT ON COLUMN student_item_permissions.student_id IS 
  'Foreign key to students table - the student who has the permission';

COMMENT ON COLUMN student_item_permissions.item_name IS 
  'Normalized item name (e.g., "Polo Shirt", "Logo Patch", "Jogging Pants") - applies to all size variants';

COMMENT ON COLUMN student_item_permissions.enabled IS 
  'Whether the student can order this item (true = can order, false = cannot order)';

COMMENT ON COLUMN student_item_permissions.quantity IS 
  'Custom max quantity for this item for this student. NULL means use default from itemMaxOrder config.';

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_student_item_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_item_permissions_updated_at
  BEFORE UPDATE ON student_item_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_student_item_permissions_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Check if table exists
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'student_item_permissions'
-- ) AS table_exists;

-- Check table structure
-- SELECT 
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'student_item_permissions'
-- ORDER BY ordinal_position;

-- Check foreign key constraint
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name = 'student_item_permissions';
