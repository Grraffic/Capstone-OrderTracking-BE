-- Add is_archived to items for Filter by Item Status (Archived / Deleted / Active)
-- is_active = false -> deleted (soft delete, existing)
-- is_archived = true -> archived (hidden from default list; show when filter "Archived")
-- is_active = true AND is_archived = false -> active (default view)

ALTER TABLE items
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_items_is_archived ON items(is_archived);

COMMENT ON COLUMN items.is_archived IS 'When true, item is archived; hidden from default list. Filter by "Archived" to see.';
