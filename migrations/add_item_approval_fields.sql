-- ============================================================================
-- Migration: Add Item Approval Fields
-- ============================================================================
-- This migration adds approval fields to the items table to support
-- system admin approval workflow:
-- - is_approved: Boolean flag indicating if item is approved for student viewing
-- - approved_by: UUID of the system admin who approved the item
-- - approved_at: Timestamp when the item was approved
--
-- Logic:
-- - New items created by property custodian: is_approved = false (pending)
-- - Existing items (duplicates): is_approved = true (auto-approved)
-- - Only approved items are visible to students
-- ============================================================================

-- Add approval fields to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance on approval status
CREATE INDEX IF NOT EXISTS idx_items_is_approved ON items(is_approved);

-- Create index for approved_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_approved_by ON items(approved_by);

-- Auto-approve all existing items (backward compatibility)
-- This ensures existing items remain visible to students
UPDATE items
SET 
  is_approved = true,
  approved_at = COALESCE(updated_at, created_at, NOW())
WHERE is_approved IS NULL OR is_approved = false;

-- Add comment to explain the approval workflow
COMMENT ON COLUMN items.is_approved IS 'Indicates if item is approved by system admin for student viewing. New items default to false (pending approval). Existing items (duplicates) are auto-approved.';
COMMENT ON COLUMN items.approved_by IS 'UUID of the system admin user who approved this item';
COMMENT ON COLUMN items.approved_at IS 'Timestamp when the item was approved by system admin';
