-- ============================================================================
-- Migration: Create Item Name Suggestions Table
-- ============================================================================
-- Date: 2026-01-28
--
-- Purpose:
-- Create a curated, admin-controlled list of item name suggestions that
-- property custodians can use when creating items.
--
-- Workflow:
-- - Property custodian can submit an item with any name (free-text)
-- - System admin reviews pending items
-- - System admin can "promote" an item's name into this table
-- - Frontend typeahead/autocomplete pulls suggestions from this table
--
-- Notes:
-- - Uses normalized_name (lowercase, trimmed, collapsed spaces) as a unique key
--   to prevent duplicates and support idempotent upserts.
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create item_name_suggestions table
CREATE TABLE IF NOT EXISTS item_name_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Display name (as entered/approved)
  name TEXT NOT NULL,

  -- Normalized name for uniqueness + searching
  normalized_name TEXT NOT NULL UNIQUE,

  -- Optional education level; if NULL, suggestion is global
  education_level TEXT NULL,

  -- Traceability back to the source item (optional)
  source_item_id UUID NULL REFERENCES items(id) ON DELETE SET NULL,

  -- System admin who promoted/created the suggestion (optional)
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup/filtering
CREATE INDEX IF NOT EXISTS idx_item_name_suggestions_normalized_name
  ON item_name_suggestions(normalized_name);

CREATE INDEX IF NOT EXISTS idx_item_name_suggestions_education_level
  ON item_name_suggestions(education_level);

CREATE INDEX IF NOT EXISTS idx_item_name_suggestions_created_at
  ON item_name_suggestions(created_at DESC);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_item_name_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_name_suggestions_updated_at ON item_name_suggestions;

CREATE TRIGGER trg_item_name_suggestions_updated_at
  BEFORE UPDATE ON item_name_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION set_item_name_suggestions_updated_at();

-- Documentation comments
COMMENT ON TABLE item_name_suggestions IS 'Curated item name suggestions promoted/approved by system admin';
COMMENT ON COLUMN item_name_suggestions.normalized_name IS 'Lowercased/trimmed/collapsed-space version of name used for uniqueness';
COMMENT ON COLUMN item_name_suggestions.education_level IS 'If set, suggestion applies only to that education level; NULL means global';

