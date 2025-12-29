-- ============================================================================
-- Add Beginning Inventory and Purchases Tracking to Items Table
-- La Verdad Uniform Ordering System
-- ============================================================================
-- This migration adds columns to track beginning inventory and purchases
-- for dynamic inventory management with annual reset functionality
-- ============================================================================

-- Add beginning_inventory column
-- This stores the initial stock when item+size is first created
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS beginning_inventory INTEGER DEFAULT 0 CHECK (beginning_inventory >= 0);

-- Add purchases column
-- This tracks total purchases added after initial stock
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS purchases INTEGER DEFAULT 0 CHECK (purchases >= 0);

-- Add beginning_inventory_date column
-- This tracks when beginning inventory was set/reset (for 1-year validity)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS beginning_inventory_date TIMESTAMP WITH TIME ZONE;

-- Add fiscal_year_start column
-- This tracks the start date of the current fiscal year for this item
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS fiscal_year_start DATE;

-- Add comments to document the columns
COMMENT ON COLUMN items.beginning_inventory IS 'Initial stock when item+size is first created. Valid for 1 year, then resets automatically.';
COMMENT ON COLUMN items.purchases IS 'Total purchases added after initial stock. Resets when beginning inventory resets.';
COMMENT ON COLUMN items.beginning_inventory_date IS 'Date when beginning inventory was set/reset. Used to determine if 1-year period has expired.';
COMMENT ON COLUMN items.fiscal_year_start IS 'Start date of the current fiscal year for this item. Used for annual inventory reset.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_beginning_inventory_date ON items(beginning_inventory_date);
CREATE INDEX IF NOT EXISTS idx_items_fiscal_year_start ON items(fiscal_year_start);

-- ============================================================================
-- Initialize existing items with beginning inventory data
-- ============================================================================
-- For existing items, set beginning_inventory = stock, purchases = 0,
-- and beginning_inventory_date = created_at

UPDATE items
SET 
  beginning_inventory = stock,
  purchases = 0,
  beginning_inventory_date = COALESCE(created_at, NOW()),
  fiscal_year_start = COALESCE(DATE(created_at), CURRENT_DATE)
WHERE beginning_inventory_date IS NULL;

-- ============================================================================
-- Create function to check and reset beginning inventory if expired
-- ============================================================================

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
    IF days_since_start > 365 THEN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically check expiry on stock updates
DROP TRIGGER IF EXISTS trigger_check_beginning_inventory_expiry ON items;

CREATE TRIGGER trigger_check_beginning_inventory_expiry
  BEFORE UPDATE OF stock ON items
  FOR EACH ROW
  EXECUTE FUNCTION check_beginning_inventory_expiry();

-- ============================================================================
-- Create function to calculate ending inventory
-- ============================================================================
-- Ending Inventory = Beginning Inventory + Purchases - Released + Returns
-- Note: Released and Returns are tracked separately (via orders/transactions)
-- This function can be used in queries to calculate ending inventory

CREATE OR REPLACE FUNCTION calculate_ending_inventory(
  p_item_id UUID,
  p_size TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_beginning_inventory INTEGER;
  v_purchases INTEGER;
  v_released INTEGER := 0;
  v_returns INTEGER := 0;
  v_ending_inventory INTEGER;
BEGIN
  -- Get beginning inventory and purchases from items table
  SELECT 
    COALESCE(beginning_inventory, 0),
    COALESCE(purchases, 0)
  INTO 
    v_beginning_inventory,
    v_purchases
  FROM items
  WHERE id = p_item_id;
  
  -- TODO: Calculate released and returns from orders/transactions table
  -- For now, we'll use stock as a proxy (this should be updated when
  -- released/returns tracking is implemented)
  
  -- Calculate ending inventory
  v_ending_inventory := v_beginning_inventory + v_purchases - v_released + v_returns;
  
  RETURN GREATEST(v_ending_inventory, 0); -- Ensure non-negative
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create function to calculate available inventory
-- ============================================================================
-- Available = Ending Inventory - Unreleased
-- Unreleased = Sum of pending orders for this item+size

CREATE OR REPLACE FUNCTION calculate_available_inventory(
  p_item_id UUID,
  p_size TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_ending_inventory INTEGER;
  v_unreleased INTEGER := 0;
  v_available INTEGER;
BEGIN
  -- Get ending inventory
  v_ending_inventory := calculate_ending_inventory(p_item_id, p_size);
  
  -- TODO: Calculate unreleased from orders table
  -- Unreleased = SUM(quantity) from orders where status = 'pending' or 'confirmed'
  -- For now, we'll use available column if it exists
  
  -- Calculate available
  v_available := v_ending_inventory - v_unreleased;
  
  RETURN GREATEST(v_available, 0); -- Ensure non-negative
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check that columns were added successfully
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'items' 
--   AND column_name IN ('beginning_inventory', 'purchases', 'beginning_inventory_date', 'fiscal_year_start')
-- ORDER BY column_name;

-- Check existing items have been initialized
-- SELECT 
--   id,
--   name,
--   stock,
--   beginning_inventory,
--   purchases,
--   beginning_inventory_date,
--   fiscal_year_start
-- FROM items
-- LIMIT 10;

-- Test expiry check function (for items older than 1 year)
-- SELECT 
--   id,
--   name,
--   beginning_inventory_date,
--   EXTRACT(DAY FROM (NOW() - beginning_inventory_date)) as days_since_start
-- FROM items
-- WHERE beginning_inventory_date IS NOT NULL
--   AND EXTRACT(DAY FROM (NOW() - beginning_inventory_date)) > 365
-- LIMIT 5;

