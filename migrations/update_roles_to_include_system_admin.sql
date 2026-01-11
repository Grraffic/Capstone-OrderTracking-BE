-- ============================================================================
-- MIGRATION: Update Roles to Include System Admin
-- ============================================================================
-- This migration:
-- 1. Updates users table to allow 'property_custodian' and 'system_admin' roles
-- 2. Updates user_roles table similarly
-- 3. Migrates existing 'admin' role to 'property_custodian'
-- 4. Updates helper functions
-- ============================================================================

-- Step 1: Drop existing CHECK constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Step 2: Add new CHECK constraints with updated roles
ALTER TABLE users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN ('student', 'property_custodian', 'system_admin'));

ALTER TABLE user_roles 
  ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('student', 'property_custodian', 'system_admin'));

-- Step 3: Migrate existing 'admin' role to 'property_custodian'
UPDATE users 
SET role = 'property_custodian' 
WHERE role = 'admin';

UPDATE user_roles 
SET role = 'property_custodian' 
WHERE role = 'admin';

-- Step 4: Update is_admin() function to handle both property_custodian and system_admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 
    AND user_roles.role IN ('property_custodian', 'system_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create helper function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 
    AND user_roles.role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create helper function to check if user is property custodian
CREATE OR REPLACE FUNCTION is_property_custodian(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 
    AND user_roles.role = 'property_custodian'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================




