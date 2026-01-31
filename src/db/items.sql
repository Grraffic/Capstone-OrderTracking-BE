-- ============================================================================
-- Items Table Schema for La Verdad Uniform Ordering System
-- ============================================================================
-- This file contains the complete database schema for the items/inventory management
-- system including:
-- - Table structure with all required fields
-- - Automatic status calculation trigger
-- - Helper functions for statistics and low stock items
-- - Row Level Security (RLS) policies
-- - Performance indexes
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Item Information
  name TEXT NOT NULL,
  education_level TEXT NOT NULL,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL,
  description TEXT,
  description_text TEXT,
  material TEXT,
  
  -- Stock and Pricing
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  image TEXT DEFAULT '/assets/image/card1.png',
  
  -- Inventory Threshold Fields
  physical_count INTEGER DEFAULT 0 CHECK (physical_count >= 0),
  available INTEGER DEFAULT 0 CHECK (available >= 0),
  reorder_point INTEGER DEFAULT 0 CHECK (reorder_point >= 0),
  note TEXT,
  
  -- Beginning Inventory and Purchases Tracking
  beginning_inventory INTEGER DEFAULT 0 CHECK (beginning_inventory >= 0),
  purchases INTEGER DEFAULT 0 CHECK (purchases >= 0),
  beginning_inventory_date TIMESTAMP WITH TIME ZONE,
  fiscal_year_start DATE,
  
  -- Status (automatically calculated by trigger)
  status TEXT DEFAULT 'Above Threshold',
  
  -- Soft Delete
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_items_education_level ON items(education_level);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_education_category ON items(education_level, category);
CREATE INDEX IF NOT EXISTS idx_items_beginning_inventory_date ON items(beginning_inventory_date);
CREATE INDEX IF NOT EXISTS idx_items_fiscal_year_start ON items(fiscal_year_start);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_items_updated_at ON items;

CREATE TRIGGER trigger_update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_items_updated_at();

-- ============================================================================
-- TRIGGER FUNCTION: Auto-calculate inventory status based on stock and reorder_point
-- ============================================================================
-- Status logic (matches At Reorder Point table):
-- - "Out of Stock": stock = 0
-- - "At Reorder Point": reorder_point > 0 AND stock <= reorder_point (and stock > 0)
-- - "Critical": stock > 0 AND stock <= 10 (when not already at reorder point)
-- - "Above Threshold": otherwise
-- ============================================================================

CREATE OR REPLACE FUNCTION update_items_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN
    NEW.status = 'Out of Stock';
  ELSIF NEW.reorder_point IS NOT NULL AND NEW.reorder_point > 0 AND NEW.stock <= NEW.reorder_point THEN
    NEW.status = 'At Reorder Point';
  ELSIF NEW.stock >= 1 AND NEW.stock <= 10 THEN
    NEW.status = 'Critical';
  ELSE
    NEW.status = 'Above Threshold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate (fire when stock OR reorder_point changes)
DROP TRIGGER IF EXISTS trigger_update_items_status ON items;

CREATE TRIGGER trigger_update_items_status
  BEFORE INSERT OR UPDATE OF stock, reorder_point ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_items_status();

-- ============================================================================
-- HELPER FUNCTION: Get Low Stock Items
-- ============================================================================
-- Returns items with "Critical" or "At Reorder Point" status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  id UUID,
  name TEXT,
  education_level TEXT,
  category TEXT,
  stock INTEGER,
  available INTEGER,
  reorder_point INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id, i.name, i.education_level, i.category,
    i.stock, i.available, i.reorder_point, i.status
  FROM items i
  WHERE i.is_active = true
    AND (i.status = 'Critical' OR i.status = 'At Reorder Point')
  ORDER BY i.stock ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Items Statistics
-- ============================================================================
-- Returns statistics for each status category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_items_stats()
RETURNS TABLE (
  total_items BIGINT,
  above_threshold_items BIGINT,
  at_reorder_point_items BIGINT,
  critical_items BIGINT,
  out_of_stock_items BIGINT,
  total_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE status = 'Above Threshold') as above_threshold_items,
    COUNT(*) FILTER (WHERE status = 'At Reorder Point') as at_reorder_point_items,
    COUNT(*) FILTER (WHERE status = 'Critical') as critical_items,
    COUNT(*) FILTER (WHERE status = 'Out of Stock') as out_of_stock_items,
    SUM(price * stock) as total_value
  FROM items
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to active items
CREATE POLICY "Public read active items"
  ON items FOR SELECT
  USING (is_active = true);

-- Policy: Allow authenticated staff (property_custodian, system_admin) full access
CREATE POLICY "Property Custodian full access to items"
  ON items FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('property_custodian', 'system_admin')
      AND staff.status = 'active'
    )
  );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert sample data for testing

/*
INSERT INTO items (name, education_level, category, item_type, description, material, stock, price, image)
VALUES
  ('Kinder Dress', 'Kindergarten', 'Kinder Dress', 'Uniform', 'Small', 'Cotton', 60, 350.00, '/assets/image/card1.png'),
  ('Grade 1 Polo', 'Grade 1', 'Boys Polo', 'Uniform', 'Medium', 'Polyester', 25, 280.00, '/assets/image/card2.png'),
  ('Grade 2 Blouse', 'Grade 2', 'Girls Blouse', 'Uniform', 'Large', 'Cotton Blend', 15, 300.00, '/assets/image/card3.png'),
  ('PE Shirt', 'Grade 3', 'PE Uniform', 'Uniform', 'XL', 'Dri-Fit', 8, 250.00, '/assets/image/card4.png'),
  ('School Tie', 'Grade 4', 'Accessories', 'Accessories', 'One Size', 'Silk', 0, 150.00, '/assets/image/card5.png');
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Use these queries to verify the setup

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'items'
-- ORDER BY ordinal_position;

-- Check triggers
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'items';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'items';

-- Test status calculation
-- SELECT name, stock, status FROM items ORDER BY stock;

-- Test statistics function
-- SELECT * FROM get_items_stats();

-- Test low stock function
-- SELECT * FROM get_low_stock_items();

-- ============================================================================
-- BEGINNING INVENTORY TRACKING FUNCTIONS
-- ============================================================================

-- Function to check and reset beginning inventory if expired (1 year)
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
    -- IMPORTANT: Only reset if purchases is being explicitly set to 0 or not being updated
    -- If purchases is being updated (NEW.purchases != OLD.purchases), don't reset it
    IF days_since_start > 365 AND (NEW.purchases = OLD.purchases OR NEW.purchases IS NULL) THEN
      -- Calculate current ending inventory (beginning + purchases - released + returns)
      -- For now, we'll use stock as ending inventory (released/returns tracked separately)
      current_ending_inventory := NEW.stock;
      
      -- Reset: beginning inventory = current ending inventory
      NEW.beginning_inventory := current_ending_inventory;
      NEW.purchases := 0;
      NEW.beginning_inventory_date := NOW();
      NEW.fiscal_year_start := CURRENT_DATE;
    ELSIF days_since_start > 365 AND NEW.purchases != OLD.purchases THEN
      -- Purchases is being explicitly updated, don't reset it
      -- Just update the beginning inventory reset date if needed
      -- But preserve the purchases value that was explicitly set
      RAISE NOTICE 'Beginning inventory expired but purchases is being updated - preserving purchases value';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically check expiry on stock updates
DROP TRIGGER IF EXISTS trigger_check_beginning_inventory_expiry ON items;

CREATE TRIGGER trigger_check_beginning_inventory_expiry
  BEFORE UPDATE OF stock ON items
  FOR EACH ROW
  EXECUTE FUNCTION check_beginning_inventory_expiry();

-- Function to calculate ending inventory
-- Ending Inventory = Beginning Inventory + Purchases - Released + Returns
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

-- Function to calculate available inventory
-- Available = Ending Inventory - Unreleased
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


