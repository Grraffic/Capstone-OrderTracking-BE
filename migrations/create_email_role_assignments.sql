-- ============================================================================
-- MIGRATION: Create Email Role Assignments Table
-- ============================================================================
-- This migration:
-- 1. Creates email_role_assignments table to store email-to-role assignments
--    made by system admins
-- 2. Migrates existing admin emails from environment variables (if any)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE EMAIL_ROLE_ASSIGNMENTS TABLE
-- ============================================================================
-- Stores email-to-role assignments made by system admins
-- 
-- Columns:
-- - id: Unique identifier (UUID)
-- - email: User's email address (unique, indexed, normalized lowercase)
-- - role: Assigned role (property_custodian or system_admin)
-- - assigned_by: System admin user ID who assigned this role
-- - created_at: When the assignment was created
-- - updated_at: Last update timestamp
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('property_custodian', 'system_admin')),
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_role_assignments_email ON email_role_assignments(email);
CREATE INDEX IF NOT EXISTS idx_email_role_assignments_role ON email_role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_email_role_assignments_assigned_by ON email_role_assignments(assigned_by);

-- ============================================================================
-- 2. AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ============================================================================
-- Automatically updates the updated_at column when a record is modified

CREATE OR REPLACE FUNCTION update_email_role_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_role_assignments_updated_at_trigger
BEFORE UPDATE ON email_role_assignments
FOR EACH ROW
EXECUTE FUNCTION update_email_role_assignments_updated_at();

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on email_role_assignments table
ALTER TABLE email_role_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage email_role_assignments (for backend operations)
CREATE POLICY "Service role can manage email_role_assignments"
  ON email_role_assignments FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow users to read email_role_assignments (for checking their own role)
CREATE POLICY "Users can read email_role_assignments"
  ON email_role_assignments FOR SELECT
  USING (true);

-- ============================================================================
-- 4. HELPER FUNCTION TO GET ROLE FOR EMAIL
-- ============================================================================
-- This function can be used to check if an email has an assigned role

CREATE OR REPLACE FUNCTION get_email_role_assignment(email_address TEXT)
RETURNS TEXT AS $$
DECLARE
  assigned_role TEXT;
BEGIN
  SELECT role INTO assigned_role
  FROM email_role_assignments
  WHERE email = LOWER(TRIM(email_address));
  
  RETURN assigned_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. DATA MIGRATION (Optional)
-- ============================================================================
-- Migrate existing admin emails from environment variables
-- This will be populated by the backend service on first run if needed
-- The backend will check SYSTEM_ADMIN_EMAILS and SPECIAL_ADMIN_EMAILS env vars
-- and create assignments for those emails

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

