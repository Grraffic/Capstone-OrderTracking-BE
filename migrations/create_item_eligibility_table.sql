-- ============================================================================
-- Migration: Create Item Eligibility Table
-- ============================================================================
-- Date: 2026-01-26
-- Purpose: Create junction table for many-to-many relationship between
--          items and education levels for eligibility management
-- ============================================================================

-- Run the schema file
\i ../src/db/item_eligibility.sql

-- ============================================================================
-- OPTIONAL: Migrate existing items.education_level data to junction table
-- ============================================================================
-- Uncomment the following section to migrate existing single education_level
-- values from items table to the new junction table
-- ============================================================================

/*
-- Insert eligibility records for all existing items based on their current education_level
INSERT INTO item_eligibility (item_id, education_level)
SELECT 
  id as item_id,
  education_level
FROM items
WHERE is_active = true
  AND education_level IS NOT NULL
  AND education_level != ''
ON CONFLICT (item_id, education_level) DO NOTHING;

-- Verify migration
SELECT 
  COUNT(*) as total_items,
  COUNT(DISTINCT item_id) as items_with_eligibility
FROM item_eligibility;
*/
