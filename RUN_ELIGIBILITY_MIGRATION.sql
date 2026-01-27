-- ============================================================================
-- Quick Migration Script for Item Eligibility Table
-- ============================================================================
-- Run this script in your Supabase SQL editor or PostgreSQL client
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create item_eligibility table
CREATE TABLE IF NOT EXISTS item_eligibility (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key to items table
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  -- Education level (matches items.education_level format)
  -- Values: 'Kindergarten', 'Elementary', 'Junior High School', 'Senior High School', 'College'
  education_level TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: an item can only have one record per education level
  CONSTRAINT unique_item_education_level UNIQUE (item_id, education_level)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_item_eligibility_item_id ON item_eligibility(item_id);
CREATE INDEX IF NOT EXISTS idx_item_eligibility_education_level ON item_eligibility(education_level);
CREATE INDEX IF NOT EXISTS idx_item_eligibility_item_education ON item_eligibility(item_id, education_level);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_item_eligibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_item_eligibility_updated_at ON item_eligibility;
CREATE TRIGGER trigger_update_item_eligibility_updated_at
  BEFORE UPDATE ON item_eligibility
  FOR EACH ROW
  EXECUTE FUNCTION update_item_eligibility_updated_at();

-- Enable RLS
ALTER TABLE item_eligibility ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read item eligibility" ON item_eligibility;
CREATE POLICY "Public read item eligibility"
  ON item_eligibility FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System Admin full access to item eligibility" ON item_eligibility;
CREATE POLICY "System Admin full access to item eligibility"
  ON item_eligibility FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'system_admin'
      AND users.is_active = true
    )
  );

-- Verify table was created
SELECT 'Item eligibility table created successfully!' as status;
