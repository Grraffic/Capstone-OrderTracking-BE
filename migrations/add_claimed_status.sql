-- ============================================
-- Add 'claimed' as a valid order status
-- Migration to fix QR Scanner order status constraint
-- ============================================

-- This migration adds 'claimed' to the check constraint for order status
-- Currently the database only allows: pending, processing, ready, completed, cancelled
-- We need to add 'claimed' so QR scanning can properly mark orders as claimed

-- Step 1: Drop the existing check constraint
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 2: Add the updated check constraint with 'claimed' included
ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'ready', 'completed', 'claimed', 'cancelled'));

-- Verify the constraint was added
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'orders' 
AND con.conname = 'orders_status_check';
