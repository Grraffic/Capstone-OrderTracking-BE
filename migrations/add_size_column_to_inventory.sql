-- ============================================
-- Add size Column to Inventory Table
-- La Verdad Uniform Ordering System
-- ============================================
-- This migration adds a size column to the inventory table
-- to properly track different sizes of the same product

-- Add size column with default value 'N/A' for non-sized items
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'N/A';

-- Create index for faster querying by name, education_level, and size combination
CREATE INDEX IF NOT EXISTS idx_inventory_name_education_size 
ON inventory(name, education_level, size);

-- Add comment to document the column
COMMENT ON COLUMN inventory.size IS 'Size of the item (XS, S, M, L, XL, XXL, or N/A for non-sized items)';

-- Update existing records: If description contains size keywords, extract them
-- Otherwise, set to 'N/A'
UPDATE inventory 
SET size = CASE
  WHEN description ILIKE '%extra small%' OR description ILIKE '%xs%' THEN 'XS'
  WHEN description ILIKE '%small%' AND description NOT ILIKE '%extra%' THEN 'S'
  WHEN description ILIKE '%medium%' OR description ILIKE '%m%' THEN 'M'
  WHEN description ILIKE '%large%' AND description NOT ILIKE '%extra%' THEN 'L'
  WHEN description ILIKE '%extra large%' OR description ILIKE '%xl%' THEN 'XL'
  WHEN description ILIKE '%xxl%' OR description ILIKE '%2xl%' THEN 'XXL'
  ELSE 'N/A'
END
WHERE size = 'N/A';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory' AND column_name = 'size';

-- Check sample data
SELECT 
  name,
  education_level,
  size,
  stock,
  status,
  description
FROM inventory
ORDER BY name, size
LIMIT 10;

