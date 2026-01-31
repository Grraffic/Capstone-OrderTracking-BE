-- ============================================================================
-- Migration: Fix SHS Skirt Eligibility for Senior High School Students
-- ============================================================================
-- Purpose: Ensure SHS Skirt items are visible to Senior High School students
--          by:
--          1. Adding eligibility entry for "Senior High School"
--          2. Approving the items if not already approved
--          3. Ensuring proper gender setting (Female for skirts)
-- ============================================================================

-- Step 1: Find all SHS Skirt items and their current status
SELECT 
  id,
  name,
  education_level,
  is_approved,
  is_active,
  is_archived,
  for_gender
FROM items
WHERE LOWER(name) LIKE '%shs%skirt%' 
   OR LOWER(name) LIKE '%senior high%skirt%'
   OR (LOWER(name) LIKE '%skirt%' AND LOWER(education_level) LIKE '%senior high%')
ORDER BY name;

-- Step 2: Add eligibility for "Senior High School" to all SHS Skirt items
-- This ensures Senior High School students can see the item
INSERT INTO item_eligibility (item_id, education_level)
SELECT DISTINCT i.id, 'Senior High School'
FROM items i
WHERE (LOWER(i.name) LIKE '%shs%skirt%' 
   OR LOWER(i.name) LIKE '%senior high%skirt%'
   OR (LOWER(i.name) LIKE '%skirt%' AND LOWER(i.education_level) LIKE '%senior high%'))
  AND i.is_active = true
  AND (i.is_archived = false OR i.is_archived IS NULL)
  AND i.id NOT IN (
    SELECT item_id 
    FROM item_eligibility 
    WHERE education_level = 'Senior High School'
  )
ON CONFLICT (item_id, education_level) DO NOTHING;

-- Step 3: Approve all SHS Skirt items (students can only see approved items)
UPDATE items
SET is_approved = true,
    approved_at = COALESCE(approved_at, NOW())
WHERE (LOWER(name) LIKE '%shs%skirt%' 
   OR LOWER(name) LIKE '%senior high%skirt%'
   OR (LOWER(name) LIKE '%skirt%' AND LOWER(education_level) LIKE '%senior high%'))
  AND is_active = true
  AND (is_archived = false OR is_archived IS NULL)
  AND (is_approved = false OR is_approved IS NULL);

-- Step 4: Ensure SHS Skirt items are marked as "Female" (skirts are typically for females)
UPDATE items
SET for_gender = 'Female'
WHERE (LOWER(name) LIKE '%shs%skirt%' 
   OR LOWER(name) LIKE '%senior high%skirt%'
   OR (LOWER(name) LIKE '%skirt%' AND LOWER(education_level) LIKE '%senior high%'))
  AND is_active = true
  AND (is_archived = false OR is_archived IS NULL)
  AND (for_gender IS NULL OR for_gender != 'Female');

-- Step 5: Verify the fix
SELECT 
  i.id,
  i.name,
  i.education_level,
  i.is_approved,
  i.for_gender,
  ie.education_level as eligibility_level
FROM items i
LEFT JOIN item_eligibility ie ON i.id = ie.item_id AND ie.education_level = 'Senior High School'
WHERE (LOWER(i.name) LIKE '%shs%skirt%' 
   OR LOWER(i.name) LIKE '%senior high%skirt%'
   OR (LOWER(i.name) LIKE '%skirt%' AND LOWER(i.education_level) LIKE '%senior high%'))
  AND i.is_active = true
ORDER BY i.name;

-- Expected result: All SHS Skirt items should have:
-- - is_approved = true
-- - for_gender = 'Female'
-- - An entry in item_eligibility with education_level = 'Senior High School'
