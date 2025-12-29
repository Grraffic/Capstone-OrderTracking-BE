-- ============================================================================
-- TEST SCRIPT: Beginning Inventory Migration
-- La Verdad Uniform Ordering System
-- ============================================================================
-- This script tests the beginning inventory migration
-- Run this BEFORE migration to check current state
-- Run this AFTER migration to verify success
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK MIGRATION STATUS
-- ============================================================================

SELECT 
  '=== MIGRATION STATUS ===' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'beginning_inventory'
    ) THEN '✓ Migration HAS been run - Columns exist'
    ELSE '✗ Migration NOT run yet - Run add_beginning_inventory_tracking.sql first'
  END as status;

-- ============================================================================
-- STEP 2: PRE-MIGRATION CHECKS (Always safe)
-- ============================================================================

SELECT '=== PRE-MIGRATION: Current State ===' as section;

-- Current columns
SELECT 
  'Current columns in items table' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- Item count
SELECT 
  'Total items' as check_type,
  COUNT(*) as total_items
FROM items;

-- ============================================================================
-- STEP 3: POST-MIGRATION VERIFICATION (Only if migration was run)
-- ============================================================================

-- Check if new columns exist
SELECT '=== POST-MIGRATION: Column Verification ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'items' 
  AND column_name IN ('beginning_inventory', 'purchases', 'beginning_inventory_date', 'fiscal_year_start')
ORDER BY column_name;

-- Verify items initialization (only if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'beginning_inventory'
  ) THEN
    RAISE NOTICE '=== POST-MIGRATION: Data Verification ===';
  ELSE
    RAISE NOTICE '⚠ Columns do not exist. Run migration first!';
  END IF;
END $$;

-- Sample data (will show error if columns don't exist - that's OK)
SELECT 
  'Sample items data' as check_type,
  id,
  name,
  stock,
  beginning_inventory,
  purchases,
  beginning_inventory_date,
  fiscal_year_start
FROM items
LIMIT 5;

-- Initialization check
SELECT 
  'Items initialization' as check_type,
  COUNT(*) as total_items,
  COUNT(beginning_inventory) as with_beginning_inventory,
  COUNT(purchases) as with_purchases,
  COUNT(beginning_inventory_date) as with_date,
  COUNT(fiscal_year_start) as with_fiscal_year
FROM items;

-- ============================================================================
-- STEP 4: VERIFY FUNCTIONS, TRIGGERS, AND INDEXES
-- ============================================================================

SELECT '=== POST-MIGRATION: Functions, Triggers, Indexes ===' as section;

-- Check functions
SELECT 
  'Functions' as check_type,
  proname as function_name
FROM pg_proc
WHERE proname IN ('calculate_ending_inventory', 'calculate_available_inventory', 'check_beginning_inventory_expiry')
ORDER BY proname;

-- Check trigger
SELECT 
  'Trigger' as check_type,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'items'
  AND trigger_name = 'trigger_check_beginning_inventory_expiry';

-- Check indexes
SELECT 
  'Indexes' as check_type,
  indexname
FROM pg_indexes
WHERE tablename = 'items'
  AND indexname IN ('idx_items_beginning_inventory_date', 'idx_items_fiscal_year_start');

-- ============================================================================
-- STEP 5: TEST FUNCTIONS (If they exist)
-- ============================================================================

DO $$
DECLARE
  test_item_id UUID;
  test_result INTEGER;
BEGIN
  -- Get a test item ID
  SELECT id INTO test_item_id FROM items LIMIT 1;
  
  IF test_item_id IS NOT NULL THEN
    -- Test calculate_ending_inventory
    BEGIN
      SELECT calculate_ending_inventory(test_item_id) INTO test_result;
      RAISE NOTICE '✓ calculate_ending_inventory works. Result: %', test_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠ calculate_ending_inventory: %', SQLERRM;
    END;        
    
    -- Test calculate_available_inventory
    BEGIN
      SELECT calculate_available_inventory(test_item_id) INTO test_result;
      RAISE NOTICE '✓ calculate_available_inventory works. Result: %', test_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠ calculate_available_inventory: %', SQLERRM;
    END;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: SUMMARY REPORT
-- ============================================================================

SELECT '=== SUMMARY REPORT ===' as section;

SELECT 
  'Columns' as check_item,
  CASE 
    WHEN COUNT(*) = 4 THEN '✓ All 4 columns exist'
    ELSE '✗ Missing - Expected 4, found ' || COUNT(*)::TEXT
  END as status
FROM information_schema.columns
WHERE table_name = 'items' 
  AND column_name IN ('beginning_inventory', 'purchases', 'beginning_inventory_date', 'fiscal_year_start')
UNION ALL
SELECT 
  'Functions',
  CASE 
    WHEN COUNT(*) = 3 THEN '✓ All 3 functions exist'
    ELSE '✗ Missing - Expected 3, found ' || COUNT(*)::TEXT
  END
FROM pg_proc
WHERE proname IN ('calculate_ending_inventory', 'calculate_available_inventory', 'check_beginning_inventory_expiry')
UNION ALL
SELECT 
  'Trigger',
  CASE 
    WHEN COUNT(*) = 1 THEN '✓ Trigger exists'
    ELSE '✗ Trigger missing'
  END
FROM information_schema.triggers
WHERE event_object_table = 'items'
  AND trigger_name = 'trigger_check_beginning_inventory_expiry'
UNION ALL
SELECT 
  'Indexes',
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ All 2 indexes exist'
    ELSE '✗ Missing - Expected 2, found ' || COUNT(*)::TEXT
  END
FROM pg_indexes
WHERE tablename = 'items'
  AND indexname IN ('idx_items_beginning_inventory_date', 'idx_items_fiscal_year_start')
UNION ALL
SELECT 
  'Data Initialized',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'beginning_inventory'
    ) AND NOT EXISTS (SELECT 1 FROM items WHERE beginning_inventory_date IS NULL)
    THEN '✓ All items initialized'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name = 'beginning_inventory'
    )
    THEN '✗ Some items not initialized'
    ELSE 'N/A - Migration not run'
  END;
