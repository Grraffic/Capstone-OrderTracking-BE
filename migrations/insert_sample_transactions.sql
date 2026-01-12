-- ============================================
-- Insert Sample Transaction Data
-- La Verdad Uniform Ordering System
-- ============================================
-- This script inserts sample transaction data for testing
-- Run this after creating the transactions table
-- ============================================

-- Note: Replace the user_id values with actual user IDs from your users table
-- You can get user IDs by running: SELECT id, name, role FROM users LIMIT 5;

-- Insert sample Order transactions
INSERT INTO transactions (type, action, user_id, user_name, user_role, details, metadata, created_at)
VALUES
  (
    'Order',
    'ORDER CREATED',
    (SELECT id FROM users WHERE role = 'student' LIMIT 1),
    (SELECT name FROM users WHERE role = 'student' LIMIT 1),
    'student',
    'Order #ORD-20250101-001 created with 3 item(s) by Student Name (Senior High School)',
    '{"order_number": "ORD-20250101-001", "item_count": 3, "total_amount": 350.00, "education_level": "Senior High School"}'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    'Order',
    'ORDER CLAIMED',
    (SELECT id FROM users WHERE role = 'student' LIMIT 1),
    (SELECT name FROM users WHERE role = 'student' LIMIT 1),
    'student',
    'Order #ORD-20250101-001 status changed from pending to claimed for Student Name',
    '{"order_number": "ORD-20250101-001", "previous_status": "pending", "new_status": "claimed"}'::jsonb,
    NOW() - INTERVAL '1 day'
  );

-- Insert sample Inventory transactions
INSERT INTO transactions (type, action, user_id, user_name, user_role, details, metadata, created_at)
VALUES
  (
    'Inventory',
    'PURCHASE RECORDED',
    (SELECT id FROM users WHERE role = 'property_custodian' LIMIT 1),
    COALESCE((SELECT name FROM users WHERE role = 'property_custodian' LIMIT 1), 'Property Custodian'),
    'property_custodian',
    'Purchase recorded: 50 unit(s) of SHS Men''s Polo (Size: Medium) at ₱120 per unit',
    '{"item_name": "SHS Men''s Polo", "size": "Medium", "quantity": 50, "unit_price": 120, "previous_stock": 100, "new_stock": 150}'::jsonb,
    NOW() - INTERVAL '3 days'
  ),
  (
    'Inventory',
    'PURCHASE RECORDED',
    (SELECT id FROM users WHERE role = 'property_custodian' LIMIT 1),
    COALESCE((SELECT name FROM users WHERE role = 'property_custodian' LIMIT 1), 'Property Custodian'),
    'property_custodian',
    'Purchase recorded: 30 unit(s) of Elementary Girls'' Dress (Size: Small) at ₱150 per unit',
    '{"item_name": "Elementary Girls'' Dress", "size": "Small", "quantity": 30, "unit_price": 150, "previous_stock": 75, "new_stock": 105}'::jsonb,
    NOW() - INTERVAL '5 days'
  );

-- Insert sample Item transactions
INSERT INTO transactions (type, action, user_id, user_name, user_role, details, metadata, created_at)
VALUES
  (
    'Item',
    'ITEM CREATED',
    (SELECT id FROM users WHERE role = 'property_custodian' LIMIT 1),
    COALESCE((SELECT name FROM users WHERE role = 'property_custodian' LIMIT 1), 'Property Custodian'),
    'property_custodian',
    'Item created: College Men''s Polo (College) - Size: Large',
    '{"item_name": "College Men''s Polo", "education_level": "College", "category": "School Uniform", "size": "Large", "stock": 200, "beginning_inventory": 200}'::jsonb,
    NOW() - INTERVAL '7 days'
  ),
  (
    'Item',
    'ITEM DETAILS UPDATED',
    (SELECT id FROM users WHERE role = 'property_custodian' LIMIT 1),
    COALESCE((SELECT name FROM users WHERE role = 'property_custodian' LIMIT 1), 'Property Custodian'),
    'property_custodian',
    'Item details updated: SHS Men''s Polo (Senior High School) - Changed: price, description',
    '{"item_name": "SHS Men''s Polo", "education_level": "Senior High School", "updated_fields": ["price", "description"]}'::jsonb,
    NOW() - INTERVAL '4 days'
  );

-- Verify the inserted data
SELECT 
  type,
  action,
  user_name,
  user_role,
  details,
  created_at
FROM transactions
ORDER BY created_at DESC;
