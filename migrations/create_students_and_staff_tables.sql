-- ============================================================================
-- MIGRATION: Create students and staff tables (Students vs Staff separation)
-- ============================================================================
-- Students: users with email @student.laverdad.edu.ph; student-only fields.
-- Staff: system_admin, property_custodian, finance_staff, accounting_staff, department_head.
-- user_id: links to auth.users(id) when using Supabase Auth; during migration from Passport, use same UUID as users.id.
-- legacy_user_id: optional link to existing users(id) for migration; drop after cutover.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STUDENTS TABLE
-- ============================================================================
-- Who goes here: any user whose auth email has domain @student.laverdad.edu.ph.

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  legacy_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  student_number TEXT,
  course_year_level TEXT,
  education_level TEXT,
  section TEXT,
  enrollment_status TEXT,
  total_item_limit INTEGER,
  total_item_limit_set_at TIMESTAMPTZ NULL,
  order_lockout_period INTEGER,
  order_lockout_unit TEXT,
  gender TEXT,
  student_type TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ NULL,
  unclaimed_void_count INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_students_education_level CHECK (education_level IS NULL OR education_level IN (
    'Kindergarten', 'Elementary', 'High School', 'Senior High School', 'College', 'Vocational'
  )),
  CONSTRAINT check_students_enrollment_status CHECK (enrollment_status IS NULL OR enrollment_status IN (
    'currently_enrolled', 'eligible_for_enrollment', 'not_eligible', 'dropped_officially'
  )),
  CONSTRAINT check_students_gender CHECK (gender IS NULL OR gender IN ('Male', 'Female')),
  CONSTRAINT check_students_student_type CHECK (student_type IS NULL OR student_type IN ('new', 'old')),
  CONSTRAINT check_students_order_lockout_unit CHECK (order_lockout_unit IS NULL OR order_lockout_unit IN ('months', 'academic_years'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_legacy_user_id ON students(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON students(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_students_education_level ON students(education_level);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

COMMENT ON TABLE students IS 'Student profiles; user_id links to auth.users(id). Students identified by email @student.laverdad.edu.ph';
COMMENT ON COLUMN students.user_id IS 'Auth identity (auth.users.id when using Supabase Auth; same as legacy users.id during migration)';
COMMENT ON COLUMN students.legacy_user_id IS 'Temporary link to users(id) for migration; remove after cutover to Supabase Auth';

-- ============================================================================
-- 2. STAFF TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  legacy_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'system_admin', 'property_custodian', 'finance_staff', 'accounting_staff', 'department_head'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  avatar_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_legacy_user_id ON staff(legacy_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);

COMMENT ON TABLE staff IS 'Staff/admin profiles; role distinguishes system_admin, property_custodian, finance_staff, accounting_staff, department_head';
COMMENT ON COLUMN staff.user_id IS 'Auth identity (auth.users.id when using Supabase Auth)';
COMMENT ON COLUMN staff.legacy_user_id IS 'Temporary link to users(id) for migration; remove after cutover';

-- ============================================================================
-- 3. TRIGGERS (updated_at)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at_trigger
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_students_updated_at();

CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_updated_at_trigger
  BEFORE UPDATE ON staff
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_updated_at();

-- ============================================================================
-- 4. RLS (basic: service_role full access; own row read/update for students/staff)
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Students: own row by user_id (auth.uid() when on Supabase Auth; for now we use legacy_user_id or app-level checks)
CREATE POLICY "Service role full access to students"
  ON students FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own student row by user_id"
  ON students FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own student row by user_id"
  ON students FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Staff: own row by user_id
CREATE POLICY "Service role full access to staff"
  ON staff FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own staff row by user_id"
  ON staff FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
