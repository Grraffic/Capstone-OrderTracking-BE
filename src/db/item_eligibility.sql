-- ============================================================================
-- Item Eligibility Junction Table Schema
-- ============================================================================
-- This table creates a many-to-many relationship between items and education levels
-- allowing items to be eligible for multiple education levels simultaneously
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ITEM_ELIGIBILITY TABLE
-- ============================================================================

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

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_item_eligibility_item_id ON item_eligibility(item_id);
CREATE INDEX IF NOT EXISTS idx_item_eligibility_education_level ON item_eligibility(education_level);
CREATE INDEX IF NOT EXISTS idx_item_eligibility_item_education ON item_eligibility(item_id, education_level);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_item_eligibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_item_eligibility_updated_at ON item_eligibility;

CREATE TRIGGER trigger_update_item_eligibility_updated_at
  BEFORE UPDATE ON item_eligibility
  FOR EACH ROW
  EXECUTE FUNCTION update_item_eligibility_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on item_eligibility table
ALTER TABLE item_eligibility ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to item eligibility
CREATE POLICY "Public read item eligibility"
  ON item_eligibility FOR SELECT
  USING (true);

-- Policy: Allow authenticated system admin users full access
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

-- ============================================================================
-- HELPER FUNCTION: Get item eligibility by item ID
-- ============================================================================

CREATE OR REPLACE FUNCTION get_item_eligibility(p_item_id UUID)
RETURNS TABLE (
  education_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT ie.education_level
  FROM item_eligibility ie
  WHERE ie.item_id = p_item_id
  ORDER BY 
    CASE ie.education_level
      WHEN 'Kindergarten' THEN 1
      WHEN 'Elementary' THEN 2
      WHEN 'Junior High School' THEN 3
      WHEN 'Senior High School' THEN 4
      WHEN 'College' THEN 5
      ELSE 6
    END;
END;
$$ LANGUAGE plpgsql;
