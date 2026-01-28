-- ============================================================================
-- Migration: Infer gender for existing items based on item names
-- ============================================================================
-- Purpose: Automatically set for_gender for existing items based on common
--          patterns in item names (dress/skirt/blouse → Female, 
--          pants/short → Male, accessories → Unisex)
-- ============================================================================

-- Update items with "dress", "skirt", or "blouse" in name → Female
UPDATE items
SET for_gender = 'Female'
WHERE LOWER(name) LIKE '%dress%'
   OR LOWER(name) LIKE '%skirt%'
   OR LOWER(name) LIKE '%blouse%';

-- Update items with "pants" or "short" (but not "jogging pants") → Male
-- Note: "jogging pants" is Unisex, so we handle it separately
UPDATE items
SET for_gender = 'Male'
WHERE (LOWER(name) LIKE '%pants%' AND LOWER(name) NOT LIKE '%jogging%')
   OR LOWER(name) LIKE '%short%';

-- Update items with "necktie", "jersey", "jogging pants", "id lace", "patch" → Unisex
UPDATE items
SET for_gender = 'Unisex'
WHERE LOWER(name) LIKE '%necktie%'
   OR LOWER(name) LIKE '%jersey%'
   OR LOWER(name) LIKE '%jogging pants%'
   OR LOWER(name) LIKE '%id lace%'
   OR LOWER(name) LIKE '%patch%'
   OR LOWER(name) LIKE '%lace%';

-- Ensure all remaining items default to Unisex (safety check)
UPDATE items
SET for_gender = 'Unisex'
WHERE for_gender IS NULL OR for_gender = '';

-- Show summary of inferred genders
SELECT 
  for_gender,
  COUNT(*) as item_count,
  STRING_AGG(DISTINCT name, ', ' ORDER BY name LIMIT 5) as sample_names
FROM items
GROUP BY for_gender
ORDER BY for_gender;

SELECT 'Migration completed: Gender inferred for existing items' as status;
