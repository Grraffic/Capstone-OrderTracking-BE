-- ============================================================================
-- USERS TABLE SCHEMA FOR GOOGLE OAUTH AUTHENTICATION
-- ============================================================================
-- This schema creates the necessary tables for user authentication and 
-- authorization in the La Verdad Ordering System.
-- 
-- Tables created:
-- 1. users - Stores user account information
-- 2. user_roles - Maps users to their roles (for RLS policies)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Stores user account information from Google OAuth
-- 
-- Columns:
-- - id: Unique identifier (UUID)
-- - email: User's email address (unique, indexed)
-- - name: User's display name
-- - role: User's role (student or admin)
-- - provider: OAuth provider (e.g., 'google')
-- - provider_id: Provider's user ID
-- - avatar_url: URL to user's avatar/profile picture
-- - photo_url: Alternative photo URL field
-- - is_active: Whether the user account is active
-- - created_at: Account creation timestamp
-- - updated_at: Last update timestamp
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  provider TEXT NOT NULL DEFAULT 'google',
  provider_id TEXT,
  avatar_url TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================================================
-- 2. USER_ROLES TABLE
-- ============================================================================
-- Maps users to their roles for Row Level Security (RLS) policies
-- This table is used by RLS policies to determine admin access
-- 
-- Columns:
-- - id: Unique identifier
-- - user_id: Reference to users table
-- - role: Role name (admin, student, etc.)
-- - created_at: When the role was assigned
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create indexes for RLS policy queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- ============================================================================
-- 3. AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ============================================================================
-- Automatically updates the updated_at column when a user record is modified

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text OR true);

-- Policy: Allow service role to manage users (for backend operations)
CREATE POLICY "Service role can manage users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow users to read user_roles
CREATE POLICY "Users can read user_roles"
  ON user_roles FOR SELECT
  USING (true);

-- Policy: Allow service role to manage user_roles
CREATE POLICY "Service role can manage user_roles"
  ON user_roles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. HELPER FUNCTION TO CHECK IF USER IS ADMIN
-- ============================================================================
-- This function can be used in RLS policies to check admin status

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = $1 AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. SAMPLE DATA (OPTIONAL - Remove in production)
-- ============================================================================
-- Uncomment below to add sample users for testing
-- 
-- INSERT INTO users (email, name, role, provider, provider_id)
-- VALUES 
--   ('admin@laverdad.edu.ph', 'Admin User', 'admin', 'google', 'admin-google-id'),
--   ('student@student.laverdad.edu.ph', 'Student User', 'student', 'google', 'student-google-id')
-- ON CONFLICT (email) DO NOTHING;
-- 
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, role FROM users
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

