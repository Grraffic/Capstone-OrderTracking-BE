-- ============================================
-- Remove Duplicate Size Entries in Inventory
-- La Verdad Uniform Ordering System
-- ============================================
-- This migration consolidates duplicate inventory entries
-- that have the same name, education_level, and size
-- by summing their stock and keeping only one record

-- Step 1: Create a temporary table with aggregated data
CREATE TEMP TABLE inventory_aggregated AS
SELECT 
  MIN(id) as keep_id,  -- Keep the first ID
  name,
  education_level,
  size,
  SUM(stock) as total_stock,
  SUM(physical_count) as total_physical_count,
  MAX(price) as price,  -- Keep the highest price
  MAX(reorder_point) as reorder_point,
  STRING_AGG(DISTINCT category, ', ') as category,
  STRING_AGG(DISTINCT item_type, ', ') as item_type,
  STRING_AGG(DISTINCT description, ' | ') as description,
  STRING_AGG(DISTINCT description_text, ' | ') as description_text,
  STRING_AGG(DISTINCT material, ', ') as material,
  STRING_AGG(DISTINCT image, ', ') as image,
  STRING_AGG(DISTINCT note, ' | ') as note,
  MAX(is_active) as is_active,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM inventory
WHERE size != 'N/A'
GROUP BY name, education_level, size
HAVING COUNT(*) > 1;

-- Step 2: Show what will be consolidated
SELECT 
  name,
  education_level,
  size,
  total_stock,
  total_physical_count
FROM inventory_aggregated
ORDER BY name, size;

-- Step 3: Update the records we're keeping with aggregated values
UPDATE inventory i
SET 
  stock = a.total_stock,
  physical_count = a.total_physical_count,
  price = a.price,
  reorder_point = a.reorder_point,
  updated_at = NOW()
FROM inventory_aggregated a
WHERE i.id = a.keep_id;

-- Step 4: Delete duplicate records (keep only the ones with keep_id)
DELETE FROM inventory i
WHERE i.id IN (
  SELECT inv.id
  FROM inventory inv
  INNER JOIN inventory_aggregated a 
    ON inv.name = a.name 
    AND inv.education_level = a.education_level 
    AND inv.size = a.size
  WHERE inv.id != a.keep_id
);

-- Step 5: Verify - check for any remaining duplicates
SELECT 
  name, 
  education_level, 
  size, 
  COUNT(*) as count,
  SUM(stock) as total_stock
FROM inventory
WHERE size != 'N/A'
GROUP BY name, education_level, size
HAVING COUNT(*) > 1;

-- Step 6: Show final consolidated records
SELECT 
  name,
  education_level,
  size,
  stock,
  status,
  description
FROM inventory
WHERE name = 'Kinder Dress' AND education_level = 'Kindergarten'
ORDER BY size;

