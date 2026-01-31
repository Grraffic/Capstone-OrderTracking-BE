-- ============================================
-- Create Transactions Table
-- La Verdad Uniform Ordering System - Transaction Logging
-- ============================================
-- This migration creates a transactions table to log all system actions
-- including orders, inventory changes, item operations, and user actions
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Transaction Type and Action
  type TEXT NOT NULL CHECK (type IN ('Order', 'Inventory', 'Item', 'User')),
  action TEXT NOT NULL, -- e.g., 'ORDER CREATED', 'STOCK ADDED', 'ITEM CREATED'
  
  -- User Information (cached for display)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  
  -- Transaction Details
  details TEXT NOT NULL, -- Human-readable transaction details
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional structured data (order_id, item_id, quantities, etc.)
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_action ON transactions(action);
CREATE INDEX IF NOT EXISTS idx_transactions_type_created_at ON transactions(type, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores all system transaction logs including orders, inventory changes, and item operations';
COMMENT ON COLUMN transactions.type IS 'Transaction category: Order, Inventory, Item, or User';
COMMENT ON COLUMN transactions.action IS 'Specific action performed (e.g., ORDER CREATED, STOCK ADDED)';
COMMENT ON COLUMN transactions.user_id IS 'Reference to users table (nullable for system actions)';
COMMENT ON COLUMN transactions.user_name IS 'Cached user name for quick display';
COMMENT ON COLUMN transactions.user_role IS 'Cached user role for quick display';
COMMENT ON COLUMN transactions.details IS 'Human-readable transaction description';
COMMENT ON COLUMN transactions.metadata IS 'JSON data containing additional transaction details (order_id, item_id, quantities, etc.)';

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Property custodians can view all transactions
CREATE POLICY "Property custodians can view all transactions"
  ON transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()::uuid
      AND staff.role = 'property_custodian'
      AND staff.status = 'active'
    )
  );

-- Policy: Service role has full access (for backend to create transactions)
CREATE POLICY "Service role has full access to transactions"
  ON transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow inserts from service role (for backend logging)
-- This is needed because the backend uses service role key, not user auth
-- The RLS policy above should handle this, but we'll be explicit
CREATE POLICY "Allow service role to insert transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS, but this ensures inserts work

-- ============================================
-- Verification Queries
-- ============================================

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions';

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transactions';
