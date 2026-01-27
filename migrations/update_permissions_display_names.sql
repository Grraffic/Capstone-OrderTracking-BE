-- ============================================================================
-- MIGRATION: Update Permissions Display Names
-- ============================================================================
-- This migration updates existing permissions display names to match
-- the desired UI structure for Role Management
-- ============================================================================

-- Update Orders permissions display names
UPDATE permissions SET display_name = 'View All Orders' WHERE name = 'view_orders';
UPDATE permissions SET display_name = 'Approve / Process Orders' WHERE name = 'approve_orders';
UPDATE permissions SET display_name = 'Update Order Status' WHERE name = 'update_orders';
UPDATE permissions SET display_name = 'View Order Status Logs' WHERE name = 'create_orders';
UPDATE permissions SET display_name = 'Cancel / Rollback Orders' WHERE name = 'delete_orders';

-- Update Inventory permissions display names for Item Management
UPDATE permissions SET display_name = 'Uniform Items' WHERE name = 'view_inventory';
UPDATE permissions SET display_name = 'Update Item Variants' WHERE name = 'update_stock';
UPDATE permissions SET display_name = 'Activate / Deactivate Items' WHERE name = 'manage_inventory';
UPDATE permissions SET display_name = 'View Item Catalog' WHERE name = 'add_stock';

-- Update Users permissions display names
UPDATE permissions SET display_name = 'Manage users (Students and employee)' WHERE name = 'update_users';

-- Add new Admin Portal permissions if they don't exist
INSERT INTO permissions (name, display_name, description, category) VALUES
('override_permissions', 'Override Permissions', 'Override system permissions', 'Roles'),
('view_audit_logs', 'View Audit Logs', 'View system audit logs', 'Reports'),
('system_configuration', 'System Configuration', 'Manage system configuration', 'Settings')
ON CONFLICT (name) DO NOTHING;

-- Note: The mapping is as follows:
-- Item Management:
--   - Uniform Items (from view_inventory)
--   - Update Item Variants (from update_stock)
--   - Activate / Deactivate Items (from manage_inventory)
--   - View Item Catalog (from add_stock)
--
-- Order Management & Inventory Management (same):
--   - View All Orders (from view_orders)
--   - Approve / Process Orders (from approve_orders)
--   - Update Order Status (from update_orders)
--   - View Order Status Logs (from create_orders)
--   - Cancel / Rollback Orders (from delete_orders)
--
-- Admin Portal:
--   - Manage users (Students and employee) (from update_users)
--   - Assign Roles (already exists)
--   - Override Permissions (new)
--   - View Audit Logs (new)
--   - System Configuration (new)
