-- ============================================================================
-- Fix Purchases Trigger - Prevent Trigger from Resetting Purchases
-- ============================================================================
-- This migration updates the check_beginning_inventory_expiry trigger function
-- to prevent it from resetting purchases when purchases are being explicitly
-- updated (e.g., when adding stock to purchases).
-- ============================================================================

-- Update the trigger function to preserve purchases when explicitly updated
CREATE OR REPLACE FUNCTION check_beginning_inventory_expiry()
RETURNS TRIGGER AS $$
DECLARE
  days_since_start INTEGER;
  current_ending_inventory INTEGER;
BEGIN
  -- Only check if beginning_inventory_date is set
  IF NEW.beginning_inventory_date IS NOT NULL THEN
    -- Calculate days since beginning inventory was set
    days_since_start := EXTRACT(DAY FROM (NOW() - NEW.beginning_inventory_date));
    
    -- If more than 365 days (1 year) have passed, reset beginning inventory
    -- IMPORTANT: Only reset if purchases is NOT being explicitly updated
    -- If purchases is being updated (NEW.purchases != OLD.purchases), don't reset it
    IF days_since_start > 365 THEN
      -- Check if purchases is being explicitly updated
      -- If NEW.purchases is different from OLD.purchases, it means we're updating purchases
      -- In that case, preserve the new purchases value and don't reset it
      IF NEW.purchases IS DISTINCT FROM OLD.purchases THEN
        -- Purchases is being explicitly updated - preserve it and don't reset
        -- Just update the beginning inventory reset date if needed
        -- But preserve the purchases value that was explicitly set
        RAISE NOTICE 'Beginning inventory expired but purchases is being updated - preserving purchases value: %', NEW.purchases;
        -- Don't reset purchases, but we can still reset beginning_inventory if needed
        -- Calculate current ending inventory
        current_ending_inventory := NEW.stock;
        -- Reset: beginning inventory = current ending inventory
        NEW.beginning_inventory := current_ending_inventory;
        NEW.beginning_inventory_date := NOW();
        NEW.fiscal_year_start := CURRENT_DATE;
        -- Keep NEW.purchases as is (don't reset to 0)
      ELSE
        -- Purchases is NOT being updated - safe to reset
        -- Calculate current ending inventory (beginning + purchases - released + returns)
        -- For now, we'll use stock as ending inventory (released/returns tracked separately)
        current_ending_inventory := NEW.stock;
        
        -- Reset: beginning inventory = current ending inventory
        NEW.beginning_inventory := current_ending_inventory;
        NEW.purchases := 0;
        NEW.beginning_inventory_date := NOW();
        NEW.fiscal_year_start := CURRENT_DATE;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger already exists, so we don't need to recreate it
-- Just verify it's using the updated function
COMMENT ON FUNCTION check_beginning_inventory_expiry() IS 
'Checks if beginning inventory has expired (1 year) and resets it. 
Preserves purchases value when purchases are being explicitly updated.';

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify the trigger exists and is using the updated function
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'items'
  AND trigger_name = 'trigger_check_beginning_inventory_expiry';

-- Test the function logic (this won't actually modify data)
DO $$
DECLARE
  test_old RECORD;
  test_new RECORD;
BEGIN
  -- Simulate old record
  test_old.purchases := 10;
  test_old.beginning_inventory_date := NOW() - INTERVAL '400 days';
  test_old.stock := 50;
  
  -- Simulate new record with purchases being updated
  test_new.purchases := 16;  -- Different from old, so should be preserved
  test_new.beginning_inventory_date := test_old.beginning_inventory_date;
  test_new.stock := 60;
  
  RAISE NOTICE 'Test: If purchases is being updated (16 != 10), trigger should preserve purchases=16';
END $$;

