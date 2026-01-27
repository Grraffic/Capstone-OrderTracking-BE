-- ============================================================================
-- MIGRATION: Create Permissions System
-- ============================================================================
-- This migration:
-- 1. Creates permissions table
-- 2. Creates role_permissions junction table
-- 3. Inserts default permissions
-- 4. Assigns default permissions to roles
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

-- ============================================================================
-- 2. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================================
-- 3. INSERT DEFAULT PERMISSIONS
-- ============================================================================

-- Orders Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('view_orders', 'View Orders', 'View all orders in the system', 'Orders'),
('create_orders', 'Create Orders', 'Create new orders', 'Orders'),
('update_orders', 'Update Orders', 'Update existing orders', 'Orders'),
('delete_orders', 'Delete Orders', 'Delete orders', 'Orders'),
('approve_orders', 'Approve Orders', 'Approve pending orders', 'Orders')
ON CONFLICT (name) DO NOTHING;

-- Inventory Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('view_inventory', 'View Inventory', 'View inventory items', 'Inventory'),
('manage_inventory', 'Manage Inventory', 'Full inventory management', 'Inventory'),
('add_stock', 'Add Stock', 'Add stock to inventory items', 'Inventory'),
('update_stock', 'Update Stock', 'Update stock levels', 'Inventory'),
('delete_inventory', 'Delete Inventory', 'Delete inventory items', 'Inventory')
ON CONFLICT (name) DO NOTHING;

-- Users Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('view_users', 'View Users', 'View all users', 'Users'),
('create_users', 'Create Users', 'Create new user accounts', 'Users'),
('update_users', 'Update Users', 'Update user information', 'Users'),
('delete_users', 'Delete Users', 'Delete user accounts', 'Users')
ON CONFLICT (name) DO NOTHING;

-- Roles Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('view_roles', 'View Roles', 'View roles and permissions', 'Roles'),
('manage_roles', 'Manage Roles', 'Create and update roles', 'Roles'),
('assign_roles', 'Assign Roles', 'Assign roles to users', 'Roles')
ON CONFLICT (name) DO NOTHING;

-- Reports Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('view_reports', 'View Reports', 'View system reports', 'Reports'),
('export_reports', 'Export Reports', 'Export reports to files', 'Reports')
ON CONFLICT (name) DO NOTHING;

-- Settings Permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
('manage_settings', 'Manage Settings', 'Manage system settings', 'Settings')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. ASSIGN DEFAULT PERMISSIONS TO ROLES
-- ============================================================================

-- System Admin: All permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'system_admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Property Custodian: Orders, Inventory, Users (view/create/update), Reports (view)
INSERT INTO role_permissions (role, permission_id)
SELECT 'property_custodian', id FROM permissions
WHERE name IN (
  'view_orders', 'create_orders', 'update_orders', 'approve_orders',
  'view_inventory', 'manage_inventory', 'add_stock', 'update_stock',
  'view_users', 'create_users', 'update_users',
  'view_reports', 'export_reports'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Finance Staff: Orders (view/approve), Reports (view/export)
INSERT INTO role_permissions (role, permission_id)
SELECT 'finance_staff', id FROM permissions
WHERE name IN (
  'view_orders', 'approve_orders',
  'view_reports', 'export_reports'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Accounting Staff: Orders (view), Reports (view/export)
INSERT INTO role_permissions (role, permission_id)
SELECT 'accounting_staff', id FROM permissions
WHERE name IN (
  'view_orders',
  'view_reports', 'export_reports'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Department Head: Orders (view), Inventory (view), Reports (view)
INSERT INTO role_permissions (role, permission_id)
SELECT 'department_head', id FROM permissions
WHERE name IN (
  'view_orders',
  'view_inventory',
  'view_reports'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Student: No permissions (handled by application logic)
-- No insert needed for students

-- ============================================================================
-- 5. CREATE UPDATE TRIGGER FOR PERMISSIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_permissions_updated_at_trigger
BEFORE UPDATE ON permissions
FOR EACH ROW
EXECUTE FUNCTION update_permissions_updated_at();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
