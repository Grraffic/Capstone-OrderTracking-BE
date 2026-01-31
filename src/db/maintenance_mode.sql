-- ============================================================================
-- Maintenance Mode Table Schema
-- ============================================================================
-- This table stores system-wide maintenance mode configuration
-- Only one row should exist (enforced by application logic)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- MAINTENANCE_MODE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_mode (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Maintenance Mode Settings
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  display_message TEXT,
  scheduled_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_mode_is_enabled ON maintenance_mode(is_enabled);
CREATE INDEX IF NOT EXISTS idx_maintenance_mode_scheduled_date ON maintenance_mode(scheduled_date);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_maintenance_mode_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update updated_at on row update
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_maintenance_mode_updated_at ON maintenance_mode;

CREATE TRIGGER trigger_update_maintenance_mode_updated_at
  BEFORE UPDATE ON maintenance_mode
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_mode_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;

-- Note: Service role key (used by backend) bypasses RLS automatically
-- These policies are for direct database access via Supabase Auth

-- Policy: System admins can read maintenance mode settings
-- Note: Service role (backend) bypasses RLS automatically
CREATE POLICY "System admins can read maintenance mode"
  ON maintenance_mode
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  );

-- Policy: System admins can insert maintenance mode settings
CREATE POLICY "System admins can insert maintenance mode"
  ON maintenance_mode
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  );

-- Policy: System admins can update maintenance mode settings
CREATE POLICY "System admins can update maintenance mode"
  ON maintenance_mode
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  );

-- Policy: System admins can delete maintenance mode settings
CREATE POLICY "System admins can delete maintenance mode"
  ON maintenance_mode
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.user_id = auth.uid()
      AND staff.role = 'system_admin'
      AND staff.status = 'active'
    )
  );

-- ============================================================================
-- INITIALIZE WITH DEFAULT ROW
-- ============================================================================
-- Insert default row if none exists (only if table is empty)
-- This ensures there's always a row to update

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM maintenance_mode) THEN
    INSERT INTO maintenance_mode (
      is_enabled,
      display_message,
      scheduled_date,
      start_time,
      end_time,
      is_all_day
    ) VALUES (
      false,
      NULL,
      NULL,
      NULL,
      NULL,
      false
    );
  END IF;
END $$;
