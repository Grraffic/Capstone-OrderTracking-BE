-- ============================================
-- Add order_type Column to Orders Table
-- La Verdad Uniform Ordering System - Pre-Order Feature
-- ============================================

-- Add order_type column to differentiate between regular orders and pre-orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'regular' CHECK (order_type IN ('regular', 'pre-order'));

-- Create index for faster querying by order_type
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Update existing orders to have 'regular' as default order_type
UPDATE orders 
SET order_type = 'regular' 
WHERE order_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN orders.order_type IS 'Type of order: regular (items in stock) or pre-order (items out of stock)';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'order_type';

-- Check updated data
SELECT 
  order_number,
  order_type,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
