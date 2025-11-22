-- ============================================================================
-- Inventory Table Schema for La Verdad Uniform Ordering System
-- ============================================================================
-- This file contains the complete database schema for the inventory management
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
-- INVENTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory (
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

CREATE INDEX IF NOT EXISTS idx_inventory_education_level ON inventory(education_level);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_item_type ON inventory(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_is_active ON inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_education_category ON inventory(education_level, category);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_inventory_updated_at ON inventory;

CREATE TRIGGER trigger_update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- ============================================================================
-- TRIGGER FUNCTION: Auto-calculate inventory status based on stock levels
-- ============================================================================
-- Status Thresholds:
-- - "Out of Stock": stock = 0
-- - "Critical": stock >= 1 AND stock < 20
-- - "At Reorder Point": stock >= 20 AND stock < 50
-- - "Above Threshold": stock >= 50
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock = 0 THEN
    NEW.status = 'Out of Stock';
  ELSIF NEW.stock >= 1 AND NEW.stock < 20 THEN
    NEW.status = 'Critical';
  ELSIF NEW.stock >= 20 AND NEW.stock < 50 THEN
    NEW.status = 'At Reorder Point';
  ELSIF NEW.stock >= 50 THEN
    NEW.status = 'Above Threshold';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_inventory_status ON inventory;

CREATE TRIGGER trigger_update_inventory_status
  BEFORE INSERT OR UPDATE OF stock ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_status();

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
  FROM inventory i
  WHERE i.is_active = true
    AND (i.status = 'Critical' OR i.status = 'At Reorder Point')
  ORDER BY i.stock ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Inventory Statistics
-- ============================================================================
-- Returns statistics for each status category
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_stats()
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
  FROM inventory
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on inventory table
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to active inventory items
CREATE POLICY "Public read active inventory"
  ON inventory FOR SELECT
  USING (is_active = true);

-- Policy: Allow authenticated admin users full access
CREATE POLICY "Admin full access to inventory"
  ON inventory FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert sample data for testing

/*
INSERT INTO inventory (name, education_level, category, item_type, description, material, stock, price, image)
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
-- WHERE table_name = 'inventory'
-- ORDER BY ordinal_position;

-- Check triggers
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'inventory';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'inventory';

-- Test status calculation
-- SELECT name, stock, status FROM inventory ORDER BY stock;

-- Test statistics function
-- SELECT * FROM get_inventory_stats();

-- Test low stock function
-- SELECT * FROM get_low_stock_items();

