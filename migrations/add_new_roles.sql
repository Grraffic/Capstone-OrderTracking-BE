-- ============================================================================
-- MIGRATION: Add New Roles (Finance Staff, Accounting Staff, Department Head)
-- ============================================================================
-- This migration:
-- 1. Updates users table to include new roles: finance_staff, accounting_staff, department_head
-- 2. Updates user_roles table similarly
-- ============================================================================

-- Step 1: Drop existing CHECK constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Step 2: Add new CHECK constraints with all roles
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'property_custodian', 'system_admin', 'finance_staff', 'accounting_staff', 'department_head'));

ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('student', 'property_custodian', 'system_admin', 'finance_staff', 'accounting_staff', 'department_head'));

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
