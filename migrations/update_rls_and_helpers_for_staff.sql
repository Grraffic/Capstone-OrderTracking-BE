-- ============================================================================
-- MIGRATION: Update RLS and helper functions to use staff table
-- ============================================================================
-- Replaces is_admin, is_system_admin, is_property_custodian to query staff.
-- Updates RLS policies on items, maintenance_mode, item_eligibility, products, transactions.
-- Run after migrate_data_to_students_and_staff.sql.
-- ============================================================================

-- 1. Helper functions: query staff table instead of user_roles
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = p_user_id
    AND staff.role IN ('property_custodian', 'system_admin')
    AND staff.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_system_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = p_user_id
    AND staff.role = 'system_admin'
    AND staff.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_property_custodian(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff
    WHERE staff.user_id = p_user_id
    AND staff.role = 'property_custodian'
    AND staff.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: get staff role for current auth user (for RLS)
CREATE OR REPLACE FUNCTION get_staff_role(p_auth_uid UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role FROM staff WHERE user_id = p_auth_uid AND status = 'active' LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Items: replace policy to use staff
DROP POLICY IF EXISTS "Property Custodian full access to items" ON items;
CREATE POLICY "Property Custodian full access to items"
  ON items FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role IN ('property_custodian', 'system_admin')
      AND staff.status = 'active'
    )
  );

-- 3. Maintenance mode: replace policies to use staff
DROP POLICY IF EXISTS "System admins can read maintenance mode" ON maintenance_mode;
CREATE POLICY "System admins can read maintenance mode"
  ON maintenance_mode FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role = 'system_admin' AND staff.status = 'active')
  );

DROP POLICY IF EXISTS "System admins can insert maintenance mode" ON maintenance_mode;
CREATE POLICY "System admins can insert maintenance mode"
  ON maintenance_mode FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role = 'system_admin' AND staff.status = 'active')
  );

DROP POLICY IF EXISTS "System admins can update maintenance mode" ON maintenance_mode;
CREATE POLICY "System admins can update maintenance mode"
  ON maintenance_mode FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role = 'system_admin' AND staff.status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role = 'system_admin' AND staff.status = 'active')
  );

DROP POLICY IF EXISTS "System admins can delete maintenance mode" ON maintenance_mode;
CREATE POLICY "System admins can delete maintenance mode"
  ON maintenance_mode FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid() AND staff.role = 'system_admin' AND staff.status = 'active')
  );

-- 4. Item eligibility: replace policy to use staff
DROP POLICY IF EXISTS "System Admin full access to item eligibility" ON item_eligibility;
CREATE POLICY "System Admin full access to item eligibility"
  ON item_eligibility FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  );

-- 5. Products: replace policies to use staff (both possible policy names)
DROP POLICY IF EXISTS "Property Custodian and System Admin full access" ON products;
DROP POLICY IF EXISTS "Enable all access for authenticated users with property custodian or system admin role" ON products;
CREATE POLICY "Staff full access to products"
  ON products FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IN (SELECT user_id FROM staff WHERE role IN ('property_custodian', 'system_admin') AND status = 'active')
  );

-- 6. Transactions: replace policy to use staff
DROP POLICY IF EXISTS "Property custodians can view all transactions" ON transactions;
CREATE POLICY "Property custodians can view all transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()::uuid
      AND staff.role = 'property_custodian'
      AND staff.status = 'active'
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
