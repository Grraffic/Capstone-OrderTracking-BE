-- ============================================================================
-- Diagnostic Query: Check SHS Skirt Eligibility
-- ============================================================================
-- This query helps diagnose why SHS Skirt is not showing for Senior High School students
-- ============================================================================

-- Step 1: Find all SHS Skirt items
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
   OR LOWER(name) = 'shs skirt'
ORDER BY name;

-- Step 2: Check eligibility entries for SHS Skirt items
SELECT 
  i.id as item_id,
  i.name,
  ie.education_level,
  ie.id as eligibility_id
FROM items i
LEFT JOIN item_eligibility ie ON i.id = ie.item_id
WHERE LOWER(i.name) LIKE '%shs%skirt%' 
   OR LOWER(i.name) LIKE '%senior high%skirt%'
   OR LOWER(i.name) = 'shs skirt'
ORDER BY i.name, ie.education_level;

-- Step 3: Fix missing eligibility (run this if SHS Skirt doesn't have "Senior High School" eligibility)
-- Replace 'ITEM_ID_HERE' with the actual item ID from Step 1
/*
INSERT INTO item_eligibility (item_id, education_level)
SELECT id, 'Senior High School'
FROM items
WHERE (LOWER(name) LIKE '%shs%skirt%' 
   OR LOWER(name) LIKE '%senior high%skirt%'
   OR LOWER(name) = 'shs skirt')
  AND is_active = true
  AND id NOT IN (
    SELECT item_id 
    FROM item_eligibility 
    WHERE education_level = 'Senior High School'
  )
ON CONFLICT (item_id, education_level) DO NOTHING;
*/

-- Step 4: Approve SHS Skirt items if they're not approved (run this if is_approved = false)
-- Replace 'ITEM_ID_HERE' with the actual item ID from Step 1
/*
UPDATE items
SET is_approved = true,
    approved_at = NOW()
WHERE (LOWER(name) LIKE '%shs%skirt%' 
   OR LOWER(name) LIKE '%senior high%skirt%'
   OR LOWER(name) = 'shs skirt')
  AND is_active = true
  AND (is_approved = false OR is_approved IS NULL);
*/
