-- ============================================================================
-- CART ITEMS TABLE
-- ============================================================================
-- This table stores shopping cart items for students
-- Each cart item references an inventory item and includes size/quantity selection
-- Cart items are temporary and can be converted to orders

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS cart_items CASCADE;

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Reference (student who owns this cart item)
  user_id UUID NOT NULL,
  
  -- Inventory Reference (which item is in the cart)
  inventory_id UUID NOT NULL,
  
  -- Item Details
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_inventory_size UNIQUE (user_id, inventory_id, size)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast lookup by user_id (most common query)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Index for inventory_id lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_inventory_id ON cart_items(inventory_id);

-- Index for created_at (for cleanup of old cart items)
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cart_items_updated_at ON cart_items;
CREATE TRIGGER trigger_update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Note: RLS is disabled for cart_items because the backend uses Supabase
-- service role key which bypasses RLS. Security is enforced at the API level
-- through JWT authentication and userId validation in the backend controllers.

-- Disable RLS (if it was previously enabled)
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS cart_items_select_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_insert_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_update_policy ON cart_items;
DROP POLICY IF EXISTS cart_items_delete_policy ON cart_items;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE cart_items IS 'Shopping cart items for students';
COMMENT ON COLUMN cart_items.id IS 'Unique identifier for cart item';
COMMENT ON COLUMN cart_items.user_id IS 'Reference to the user who owns this cart item';
COMMENT ON COLUMN cart_items.inventory_id IS 'Reference to the inventory item';
COMMENT ON COLUMN cart_items.size IS 'Selected size for the item';
COMMENT ON COLUMN cart_items.quantity IS 'Quantity of items in cart';
COMMENT ON COLUMN cart_items.created_at IS 'Timestamp when cart item was added';
COMMENT ON COLUMN cart_items.updated_at IS 'Timestamp when cart item was last updated';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all cart items for a user with inventory details
-- SELECT 
--   ci.id,
--   ci.user_id,
--   ci.inventory_id,
--   ci.size,
--   ci.quantity,
--   ci.created_at,
--   ci.updated_at,
--   i.name,
--   i.education_level,
--   i.category,
--   i.item_type,
--   i.image,
--   i.stock
-- FROM cart_items ci
-- JOIN inventory i ON ci.inventory_id = i.id
-- WHERE ci.user_id = 'user-uuid-here'
-- ORDER BY ci.created_at DESC;

-- Add item to cart (or update quantity if exists)
-- INSERT INTO cart_items (user_id, inventory_id, size, quantity)
-- VALUES ('user-uuid', 'inventory-uuid', 'M', 1)
-- ON CONFLICT (user_id, inventory_id, size)
-- DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity;

-- Update cart item quantity
-- UPDATE cart_items
-- SET quantity = 2
-- WHERE id = 'cart-item-uuid' AND user_id = 'user-uuid';

-- Remove item from cart
-- DELETE FROM cart_items
-- WHERE id = 'cart-item-uuid' AND user_id = 'user-uuid';

-- Clear entire cart for a user
-- DELETE FROM cart_items
-- WHERE user_id = 'user-uuid';

-- Get cart item count for a user
-- SELECT COUNT(*) as item_count
-- FROM cart_items
-- WHERE user_id = 'user-uuid';

