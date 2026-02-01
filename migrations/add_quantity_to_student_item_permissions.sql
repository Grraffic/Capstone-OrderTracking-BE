-- ============================================================================
-- MIGRATION: Add Quantity Column to Student Item Permissions
-- ============================================================================
-- Date: 2025-01-XX
-- Description: Adds quantity column to allow custom max quantities per item per student
-- ============================================================================

-- Add quantity column (NULL means use default from config, otherwise use this value)
ALTER TABLE student_item_permissions
ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- Add check constraint for quantity (must be positive if set)
ALTER TABLE student_item_permissions
DROP CONSTRAINT IF EXISTS check_student_item_permissions_quantity;
ALTER TABLE student_item_permissions
ADD CONSTRAINT check_student_item_permissions_quantity
CHECK (quantity IS NULL OR quantity > 0);

-- Add comment
COMMENT ON COLUMN student_item_permissions.quantity IS 'Custom max quantity for this item for this student. NULL means use default from itemMaxOrder config.';
