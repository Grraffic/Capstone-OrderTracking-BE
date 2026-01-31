-- ============================================================================
-- Inventory Views and Functions for Reporting
-- La Verdad Uniform Ordering System
-- ============================================================================
-- This file contains views, functions, and queries for inventory reporting
-- The actual table is "items" - this file provides inventory-specific views
-- Used by Inventory.jsx page for inventory management and reporting
-- ============================================================================

-- ============================================================================
-- INVENTORY REPORT VIEW
-- ============================================================================
-- This view provides a comprehensive inventory report with all calculated fields
-- Used by the Inventory.jsx page to display inventory data
-- ============================================================================

CREATE OR REPLACE VIEW inventory_report AS
SELECT 
  i.id,
  i.name,
  i.education_level,
  i.category,
  i.item_type,
  i.size,
  i.stock,
  i.beginning_inventory,
  i.purchases,
  i.beginning_inventory_date,
  i.fiscal_year_start,
  i.price as unit_price,
  -- Calculate ending inventory: Beginning + Purchases - Released + Returns
  -- Note: Released and Returns need to be calculated from orders table
  (i.beginning_inventory + COALESCE(i.purchases, 0)) as calculated_ending_inventory,
  -- Calculate available: Ending Inventory - Unreleased
  -- Note: Unreleased needs to be calculated from orders table
  i.available,
  -- Calculate total amount: (Beginning Inventory * Unit Price) + (Purchases * Unit Price)
  ((i.beginning_inventory * i.price) + (COALESCE(i.purchases, 0) * i.price)) as total_amount,
  i.status,
  i.is_active,
  i.created_at,
  i.updated_at
FROM items i
WHERE i.is_active = true
  AND (i.is_archived = false OR i.is_archived IS NULL);

-- ============================================================================
-- INVENTORY SUMMARY FUNCTION
-- ============================================================================
-- Returns summary statistics for inventory reporting
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_education_level TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_items BIGINT,
  total_beginning_inventory BIGINT,
  total_purchases BIGINT,
  total_ending_inventory BIGINT,
  total_value NUMERIC,
  items_above_threshold BIGINT,
  items_at_reorder_point BIGINT,
  items_critical BIGINT,
  items_out_of_stock BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_items,
    SUM(COALESCE(i.beginning_inventory, 0)) as total_beginning_inventory,
    SUM(COALESCE(i.purchases, 0)) as total_purchases,
    SUM(COALESCE(i.beginning_inventory, 0) + COALESCE(i.purchases, 0)) as total_ending_inventory,
    SUM((COALESCE(i.beginning_inventory, 0) * i.price) + (COALESCE(i.purchases, 0) * i.price)) as total_value,
    COUNT(*) FILTER (WHERE i.status = 'Above Threshold') as items_above_threshold,
    COUNT(*) FILTER (WHERE i.status = 'At Reorder Point') as items_at_reorder_point,
    COUNT(*) FILTER (WHERE i.status = 'Critical') as items_critical,
    COUNT(*) FILTER (WHERE i.status = 'Out of Stock') as items_out_of_stock
  FROM items i
  WHERE i.is_active = true
    AND (i.is_archived = false OR i.is_archived IS NULL)
    AND (p_education_level IS NULL OR i.education_level = p_education_level)
    AND (
      p_start_date IS NULL OR 
      p_end_date IS NULL OR
      (i.created_at::DATE BETWEEN p_start_date AND p_end_date)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INVENTORY BY SIZE VIEW
-- ============================================================================
-- Groups inventory by item name and size for reporting
-- Used by Inventory.jsx to display items with their size variants
-- ============================================================================

CREATE OR REPLACE VIEW inventory_by_size AS
SELECT 
  i.name,
  i.education_level,
  i.size,
  i.id,
  i.stock,
  i.beginning_inventory,
  i.purchases,
  i.beginning_inventory_date,
  i.fiscal_year_start,
  i.price as unit_price,
  (i.beginning_inventory + COALESCE(i.purchases, 0)) as ending_inventory,
  i.available,
  ((i.beginning_inventory * i.price) + (COALESCE(i.purchases, 0) * i.price)) as total_amount,
  i.status,
  -- Calculate days since beginning inventory was set
  CASE 
    WHEN i.beginning_inventory_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (NOW() - i.beginning_inventory_date))
    ELSE NULL
  END as days_since_start,
  -- Check if beginning inventory is expired (>365 days)
  CASE 
    WHEN i.beginning_inventory_date IS NOT NULL 
      AND EXTRACT(DAY FROM (NOW() - i.beginning_inventory_date)) > 365 
    THEN true
    ELSE false
  END as is_expired
FROM items i
WHERE i.is_active = true
ORDER BY i.name, i.education_level, i.size;

-- ============================================================================
-- INVENTORY TRANSACTIONS VIEW (Placeholder)
-- ============================================================================
-- This view will be used to track inventory transactions
-- Currently returns data from items table, but can be extended
-- to join with orders/transactions table when implemented
-- ============================================================================

CREATE OR REPLACE VIEW inventory_transactions_summary AS
SELECT 
  i.id as item_id,
  i.name,
  i.size,
  i.education_level,
  i.beginning_inventory,
  i.purchases,
  -- TODO: Calculate released from orders table
  0 as released,
  -- TODO: Calculate returns from orders/returns table
  0 as returns,
  -- TODO: Calculate unreleased from orders table (pending orders)
  0 as unreleased,
  i.available,
  (i.beginning_inventory + COALESCE(i.purchases, 0)) as ending_inventory,
  i.beginning_inventory_date,
  i.fiscal_year_start
FROM items i
WHERE i.is_active = true
  AND (i.is_archived = false OR i.is_archived IS NULL);

-- ============================================================================
-- FUNCTION: Get Inventory Report for Frontend
-- ============================================================================
-- This function returns inventory data formatted for the Inventory.jsx page
-- Includes all fields needed for the inventory table display
-- ============================================================================

CREATE OR REPLACE FUNCTION get_inventory_report_data(
  p_education_level TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  education_level TEXT,
  size TEXT,
  beginning_inventory INTEGER,
  purchases INTEGER,
  released INTEGER,
  returns INTEGER,
  unreleased INTEGER,
  available INTEGER,
  ending_inventory INTEGER,
  unit_price NUMERIC,
  total_amount NUMERIC,
  status TEXT,
  beginning_inventory_date TIMESTAMP WITH TIME ZONE,
  fiscal_year_start DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.education_level,
    COALESCE(i.size, 'N/A') as size,
    COALESCE(i.beginning_inventory, 0) as beginning_inventory,
    COALESCE(i.purchases, 0) as purchases,
    -- TODO: Calculate from orders table
    0 as released,
    -- TODO: Calculate from returns table
    0 as returns,
    -- TODO: Calculate from orders table (pending orders)
    0 as unreleased,
    COALESCE(i.available, 0) as available,
    (COALESCE(i.beginning_inventory, 0) + COALESCE(i.purchases, 0)) as ending_inventory,
    i.price as unit_price,
    ((COALESCE(i.beginning_inventory, 0) * i.price) + (COALESCE(i.purchases, 0) * i.price)) as total_amount,
    i.status,
    i.beginning_inventory_date,
    i.fiscal_year_start
  FROM items i
  WHERE i.is_active = true
    AND (i.is_archived = false OR i.is_archived IS NULL)
    AND (p_education_level IS NULL OR i.education_level = p_education_level)
    AND (
      p_search_term IS NULL OR
      i.name ILIKE '%' || p_search_term || '%' OR
      i.education_level ILIKE '%' || p_search_term || '%' OR
      i.category ILIKE '%' || p_search_term || '%'
    )
  ORDER BY i.name, i.education_level, i.size
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW inventory_report IS 'Comprehensive inventory report view with all calculated fields';
COMMENT ON VIEW inventory_by_size IS 'Inventory grouped by item name and size for reporting';
COMMENT ON VIEW inventory_transactions_summary IS 'Summary of inventory transactions (released, returns, unreleased)';
COMMENT ON FUNCTION get_inventory_summary IS 'Returns summary statistics for inventory reporting';
COMMENT ON FUNCTION get_inventory_report_data IS 'Returns inventory data formatted for Inventory.jsx frontend page';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test inventory report view
-- SELECT * FROM inventory_report LIMIT 10;

-- Test inventory summary function
-- SELECT * FROM get_inventory_summary();

-- Test inventory by size view
-- SELECT * FROM inventory_by_size LIMIT 10;

-- Test inventory report data function
-- SELECT * FROM get_inventory_report_data(NULL, NULL, 10, 0);


