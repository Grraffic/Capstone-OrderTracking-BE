-- ============================================
-- Add order_type Column - Safe Version
-- Handles case where column may not exist yet
-- ============================================

DO $$
BEGIN
    -- Check if order_type column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'order_type'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE orders 
        ADD COLUMN order_type VARCHAR(20) DEFAULT 'regular' 
        CHECK (order_type IN ('regular', 'pre-order'));
        
        -- Create index
        CREATE INDEX idx_orders_order_type ON orders(order_type);
        
        -- Update existing orders
        UPDATE orders 
        SET order_type = 'regular' 
        WHERE order_type IS NULL;
        
        RAISE NOTICE 'order_type column added successfully';
    ELSE
        RAISE NOTICE 'order_type column already exists';
    END IF;
END $$;

-- Verify the column exists
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' 
AND column_name = 'order_type';
