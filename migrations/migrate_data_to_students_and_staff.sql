-- ============================================================================
-- MIGRATION: Migrate data from users/user_roles into students and staff
-- ============================================================================
-- Run after create_students_and_staff_tables.sql.
-- Copies students from users (role = 'student') and staff from users (role in staff roles).
-- Updates orders.student_id to students.id, cart_items to student_id, email_role_assignments.assigned_by to staff.id.
-- ============================================================================

-- 1. Insert students from users where role = 'student'
-- Prerequisite: run rename_max_items_to_total_item_limit.sql so users has total_item_limit, total_item_limit_set_at
INSERT INTO students (
  user_id,
  legacy_user_id,
  name,
  email,
  student_number,
  course_year_level,
  education_level,
  section,
  enrollment_status,
  total_item_limit,
  total_item_limit_set_at,
  order_lockout_period,
  order_lockout_unit,
  gender,
  student_type,
  onboarding_completed,
  onboarding_completed_at,
  unclaimed_void_count,
  avatar_url,
  photo_url,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  u.name,
  u.email,
  u.student_number,
  u.course_year_level,
  u.education_level,
  NULL,
  u.enrollment_status,
  u.total_item_limit,
  u.total_item_limit_set_at,
  u.order_lockout_period,
  u.order_lockout_unit,
  u.gender,
  u.student_type,
  COALESCE(u.onboarding_completed, false),
  u.onboarding_completed_at,
  COALESCE(u.unclaimed_void_count, 0),
  u.avatar_url,
  u.photo_url,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.role = 'student'
ON CONFLICT (user_id) DO NOTHING;

-- 2. Insert staff from users where role is a staff role
INSERT INTO staff (
  user_id,
  legacy_user_id,
  name,
  email,
  role,
  status,
  avatar_url,
  photo_url,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.id,
  u.name,
  u.email,
  u.role,
  CASE WHEN u.is_active = false THEN 'inactive' ELSE 'active' END,
  u.avatar_url,
  u.photo_url,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.role IN ('system_admin', 'property_custodian', 'finance_staff', 'accounting_staff', 'department_head')
ON CONFLICT (user_id) DO NOTHING;

-- 3. Update orders: set student_id to students.id where current student_id = users.id (legacy_user_id)
UPDATE orders o
SET student_id = s.id
FROM students s
WHERE s.legacy_user_id = o.student_id AND o.student_id IS NOT NULL;

-- 4. Add FK on orders.student_id -> students(id) if not present
ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_student_id;
ALTER TABLE orders ADD CONSTRAINT fk_orders_student_id
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL;

-- 5. Cart items: add student_id, populate from students.legacy_user_id = cart_items.user_id, then switch
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS student_id UUID NULL;

UPDATE cart_items ci
SET student_id = s.id
FROM students s
WHERE s.legacy_user_id = ci.user_id;

-- Drop old unique constraint and user_id; add FK and new unique constraint
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS unique_user_inventory_size;
-- Remove cart items that have no matching student (orphaned)
DELETE FROM cart_items WHERE student_id IS NULL AND user_id IS NOT NULL;
ALTER TABLE cart_items ALTER COLUMN student_id SET NOT NULL;
ALTER TABLE cart_items DROP COLUMN IF EXISTS user_id;
ALTER TABLE cart_items ADD CONSTRAINT fk_cart_items_student_id
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD CONSTRAINT unique_student_inventory_size UNIQUE (student_id, inventory_id, size);

CREATE INDEX IF NOT EXISTS idx_cart_items_student_id ON cart_items(student_id);

-- 6. Email role assignments: point assigned_by to staff.id
ALTER TABLE email_role_assignments ALTER COLUMN assigned_by DROP NOT NULL;
ALTER TABLE email_role_assignments DROP CONSTRAINT IF EXISTS email_role_assignments_assigned_by_fkey;

UPDATE email_role_assignments era
SET assigned_by = s.id
FROM staff s
WHERE s.legacy_user_id = era.assigned_by;

ALTER TABLE email_role_assignments ADD CONSTRAINT email_role_assignments_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES staff(id) ON DELETE SET NULL;

-- 7. Update email_role_assignments role CHECK to include all five staff roles
ALTER TABLE email_role_assignments DROP CONSTRAINT IF EXISTS email_role_assignments_role_check;
ALTER TABLE email_role_assignments ADD CONSTRAINT email_role_assignments_role_check
  CHECK (role IN ('property_custodian', 'system_admin', 'finance_staff', 'accounting_staff', 'department_head'));

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
