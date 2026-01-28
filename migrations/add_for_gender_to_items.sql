-- ============================================================================
-- Migration: Add for_gender column to items table
-- ============================================================================
-- Purpose: Add gender field to items so Property Custodian can mark items
--          as "For Female", "For Male", or "Unisex" (for both)
-- ============================================================================

-- Add for_gender column with default 'Unisex'
ALTER TABLE items
ADD COLUMN IF NOT EXISTS for_gender TEXT NOT NULL DEFAULT 'Unisex';

-- Add CHECK constraint to ensure only valid values
ALTER TABLE items
DROP CONSTRAINT IF EXISTS check_for_gender;

ALTER TABLE items
ADD CONSTRAINT check_for_gender
CHECK (for_gender IN ('Male', 'Female', 'Unisex'));

-- Add index for filtering performance
CREATE INDEX IF NOT EXISTS idx_items_for_gender ON items(for_gender);

-- Add comment explaining the field
COMMENT ON COLUMN items.for_gender IS 'Target gender for the item: Male, Female, or Unisex (for both). Used to restrict ordering by student gender.';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'items' 
  AND column_name = 'for_gender';

SELECT 'Migration completed: for_gender column added to items table' as status;
