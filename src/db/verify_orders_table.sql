-- ============================================
-- Orders Table Verification Script
-- La Verdad Uniform Ordering System
-- ============================================

-- 1. Check if orders table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'orders';

-- 2. Verify all columns exist with correct types
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders';

-- 4. List all RLS policies
SELECT 
  policyname as policy_name,
  cmd as operation,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 5. List all indexes
SELECT 
  indexname as index_name,
  indexdef as index_definition
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY indexname;

-- 6. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation as event,
  action_timing as timing,
  action_statement as action
FROM information_schema.triggers
WHERE event_object_table = 'orders';

-- 7. Count existing orders
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
  COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
  COUNT(CASE WHEN is_active = false THEN 1 END) as deleted_orders
FROM orders;

-- 8. Show recent orders (if any)
SELECT 
  order_number,
  student_name,
  student_email,
  education_level,
  status,
  jsonb_array_length(items) as item_count,
  total_amount,
  order_date,
  created_at
FROM orders
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 9. Test order number uniqueness constraint
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY constraint_name;

-- 10. Verify JSONB items structure (if orders exist)
SELECT 
  order_number,
  jsonb_pretty(items) as items_json
FROM orders
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- Expected Results Summary
-- ============================================

/*
✅ EXPECTED RESULTS:

1. Table exists: orders (BASE TABLE)

2. Columns (17 total):
   - id (uuid, NOT NULL, uuid_generate_v4())
   - order_number (text, NOT NULL)
   - student_id (uuid, NULL)
   - student_name (text, NOT NULL)
   - student_email (text, NOT NULL)
   - education_level (text, NOT NULL)
   - items (jsonb, NOT NULL, '[]'::jsonb)
   - total_amount (numeric, NOT NULL, 0)
   - status (text, NOT NULL, 'pending'::text)
   - qr_code_data (text, NULL)
   - order_date (timestamptz, NULL, now())
   - payment_date (timestamptz, NULL)
   - claimed_date (timestamptz, NULL)
   - notes (text, NULL)
   - is_active (boolean, NULL, true)
   - created_at (timestamptz, NULL, now())
   - updated_at (timestamptz, NULL, now())

3. RLS enabled: true

4. RLS Policies (5 total):
   - Admins can update orders (UPDATE, authenticated)
   - Admins can view all orders (SELECT, authenticated)
   - Service role has full access (ALL, service_role)
   - Students can insert their own orders (INSERT, authenticated)
   - Students can view their own orders (SELECT, authenticated)

5. Indexes (10 total):
   - orders_pkey (PRIMARY KEY on id)
   - orders_order_number_key (UNIQUE on order_number)
   - idx_orders_order_number
   - idx_orders_student_email
   - idx_orders_student_id
   - idx_orders_status
   - idx_orders_education_level
   - idx_orders_created_at
   - idx_orders_order_date
   - idx_orders_is_active_created_at

6. Trigger:
   - trigger_update_orders_updated_at (BEFORE UPDATE)

7. Order counts: (depends on your data)

8. Recent orders: (depends on your data)

9. Constraints:
   - orders_pkey (PRIMARY KEY)
   - orders_order_number_key (UNIQUE)

10. Items JSON structure example:
[
  {
    "id": "123",
    "name": "Basic Education Uniform",
    "quantity": 2,
    "size": "Large",
    "price": 0
  }
]
*/

-- ============================================
-- Quick Test: Insert Sample Order
-- ============================================

-- Uncomment to test order insertion:
/*
INSERT INTO orders (
  order_number,
  student_name,
  student_email,
  education_level,
  items,
  total_amount,
  qr_code_data,
  status
) VALUES (
  'ORD-TEST-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'Test Student',
  'test.student@student.laverdad.edu.ph',
  'Senior High School',
  '[{"id":"1","name":"Test Uniform","quantity":1,"size":"Medium","price":0}]'::jsonb,
  0,
  '{"type":"order_receipt","orderNumber":"ORD-TEST-12345"}',
  'pending'
)
RETURNING 
  id,
  order_number,
  student_name,
  created_at;
*/

-- ============================================
-- Cleanup Test Order (if inserted above)
-- ============================================

-- Uncomment to delete test orders:
/*
DELETE FROM orders 
WHERE order_number LIKE 'ORD-TEST-%';
*/

