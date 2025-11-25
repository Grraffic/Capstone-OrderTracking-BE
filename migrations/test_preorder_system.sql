-- ============================================
-- Pre-Order System - Test Data Setup
-- La Verdad Uniform Ordering System
-- ============================================
-- This script helps you set up test data to verify the pre-order system

-- ============================================
-- STEP 1: Create Test Products
-- ============================================

-- Option A: Set an existing product to out of stock for testing
-- (Replace 'YOUR_PRODUCT_ID' with an actual inventory item ID)
/*
UPDATE inventory 
SET 
  stock = 0,
  status = 'out_of_stock'
WHERE id = 'YOUR_PRODUCT_ID';
*/

-- Option B: Find products that are already out of stock
SELECT 
  id,
  name,
  stock,
  status,
  education_level,
  item_type
FROM inventory
WHERE stock = 0 OR status = 'out_of_stock'
ORDER BY name
LIMIT 10;

-- Option C: Find products that are in stock
SELECT 
  id,
  name,
  stock,
  status,
  education_level,
  item_type
FROM inventory
WHERE stock > 0 AND status != 'out_of_stock'
ORDER BY name
LIMIT 10;

-- ============================================
-- STEP 2: Verify Order Type Column Exists
-- ============================================

-- Check if order_type column was added successfully
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'order_type';

-- Expected result:
-- column_name | data_type      | column_default | is_nullable
-- order_type  | character varying | 'regular'  | YES

-- ============================================
-- STEP 3: Check Current Orders
-- ============================================

-- View all orders with their type
SELECT 
  order_number,
  student_name,
  order_type,
  status,
  jsonb_array_length(items) as item_count,
  created_at
FROM orders
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- Count orders by type
SELECT 
  order_type,
  COUNT(*) as count
FROM orders
WHERE is_active = true
GROUP BY order_type;

-- ============================================
-- STEP 4: Manually Create Test Orders (Optional)
-- ============================================

-- Create a test PRE-ORDER
-- (Uncomment and modify with your student details)
/*
INSERT INTO orders (
  order_number,
  student_id,
  student_name,
  student_email,
  education_level,
  items,
  total_amount,
  order_type,
  status,
  notes
) VALUES (
  'TEST-PRE-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'YOUR_STUDENT_UID',
  'Test Student',
  'test@student.laverdad.edu.ph',
  'Senior High School',
  '[
    {
      "name": "Test Uniform",
      "size": "Medium",
      "quantity": 1,
      "item_type": "Uniform",
      "education_level": "Senior High School",
      "image": null
    }
  ]'::jsonb,
  0,
  'pre-order',
  'pending',
  'Test pre-order for system verification'
)
RETURNING 
  id,
  order_number,
  order_type,
  status,
  created_at;
*/

-- Create a test REGULAR ORDER
-- (Uncomment and modify with your student details)
/*
INSERT INTO orders (
  order_number,
  student_id,
  student_name,
  student_email,
  education_level,
  items,
  total_amount,
  order_type,
  status,
  notes
) VALUES (
  'TEST-REG-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
  'YOUR_STUDENT_UID',
  'Test Student',
  'test@student.laverdad.edu.ph',
  'College',
  '[
    {
      "name": "Test Book",
      "size": "N/A",
      "quantity": 2,
      "item_type": "Supplies",
      "education_level": "College",
      "image": null
    }
  ]'::jsonb,
  0,
  'regular',
  'pending',
  'Test regular order for system verification'
)
RETURNING 
  id,
  order_number,
  order_type,
  status,
  created_at;
*/

-- ============================================
-- STEP 5: Verification Queries
-- ============================================

-- Verify pre-orders are created correctly
SELECT 
  order_number,
  student_name,
  order_type,
  status,
  items,
  notes,
  created_at
FROM orders
WHERE order_type = 'pre-order'
  AND is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- Verify regular orders are created correctly
SELECT 
  order_number,
  student_name,
  order_type,
  status,
  items,
  notes,
  created_at
FROM orders
WHERE order_type = 'regular'
  AND is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- STEP 6: Check Inventory Impact
-- ============================================

-- For regular orders, inventory should be reduced
-- For pre-orders, inventory should NOT be reduced (already at 0)

-- View recent inventory updates
SELECT 
  id,
  name,
  stock,
  status,
  education_level,
  updated_at
FROM inventory
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: Analytics Queries
-- ============================================

-- Count orders by type and status
SELECT 
  order_type,
  status,
  COUNT(*) as count,
  SUM(jsonb_array_length(items)) as total_items
FROM orders
WHERE is_active = true
GROUP BY order_type, status
ORDER BY order_type, status;

-- Find most frequently pre-ordered items
SELECT 
  item->>'name' as item_name,
  item->>'education_level' as education_level,
  COUNT(*) as pre_order_count,
  SUM((item->>'quantity')::int) as total_quantity
FROM orders,
  jsonb_array_elements(items) as item
WHERE order_type = 'pre-order'
  AND is_active = true
GROUP BY item->>'name', item->>'education_level'
ORDER BY pre_order_count DESC
LIMIT 10;

-- Students with most pre-orders
SELECT 
  student_name,
  student_email,
  COUNT(*) as pre_order_count,
  MAX(created_at) as last_pre_order_date
FROM orders
WHERE order_type = 'pre-order'
  AND is_active = true
GROUP BY student_name, student_email
ORDER BY pre_order_count DESC
LIMIT 10;

-- ============================================
-- STEP 8: Cleanup Test Data (Use Carefully!)
-- ============================================

-- Delete test orders (Uncomment only if you want to clean up)
-- WARNING: This will permanently delete test orders!
/*
DELETE FROM orders 
WHERE order_number LIKE 'TEST-PRE-%' 
   OR order_number LIKE 'TEST-REG-%';
*/

-- Soft delete test orders (Recommended - keeps data but marks inactive)
/*
UPDATE orders 
SET is_active = false
WHERE order_number LIKE 'TEST-PRE-%' 
   OR order_number LIKE 'TEST-REG-%';
*/

-- ============================================
-- STEP 9: Reset Product Stock (Optional)
-- ============================================

-- If you set products to out of stock for testing, reset them here
/*
UPDATE inventory 
SET 
  stock = 10,  -- Set to desired stock level
  status = 'in_stock'
WHERE id = 'YOUR_PRODUCT_ID';
*/

-- ============================================
-- Expected Results Summary
-- ============================================

/*
✅ WHAT YOU SHOULD SEE:

1. Order Type Column:
   - Exists in orders table
   - Type: VARCHAR(20)
   - Default: 'regular'
   - Values: 'regular' or 'pre-order'

2. Pre-Orders:
   - order_type = 'pre-order'
   - Created when stock = 0 or status = 'out_of_stock'
   - Inventory NOT reduced
   - Appear in "Pre-Orders" tab in student profile

3. Regular Orders:
   - order_type = 'regular'
   - Created when stock > 0
   - Inventory IS reduced
   - Appear in "Orders" or "Claimed" tabs in student profile

4. Filtering:
   - Pre-orders excluded from "Orders" tab
   - Pre-orders excluded from "Claimed" tab
   - Regular orders excluded from "Pre-Orders" tab

5. Notes Field:
   - Pre-orders: "Pre-order placed via..."
   - Regular orders: "Order placed via..."
*/
