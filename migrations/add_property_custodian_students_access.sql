-- ============================================================================
-- MIGRATION: Add Staff Access to Students Table
-- ============================================================================
-- This migration adds RLS policies to allow property_custodian, system_admin,
-- finance_staff, accounting_staff, and department_head roles to read all students,
-- enabling them to manage student lists and eligibility.
-- ============================================================================

-- Policy: Allow staff roles to read all students
CREATE POLICY "Staff can read all students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()::uuid
      AND staff.role IN ('property_custodian', 'system_admin', 'finance_staff', 'accounting_staff', 'department_head')
      AND staff.status = 'active'
    )
  );

-- Policy: Allow staff roles to update students
-- (for managing student permissions and eligibility)
CREATE POLICY "Staff can update students"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()::uuid
      AND staff.role IN ('property_custodian', 'system_admin', 'finance_staff', 'accounting_staff', 'department_head')
      AND staff.status = 'active'
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
