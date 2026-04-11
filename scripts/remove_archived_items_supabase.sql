-- ============================================================================
-- Remove items from the archive (run in Supabase SQL Editor)
-- ============================================================================
-- In this project:
--   Archived = is_active = true AND is_archived = true
--   Deleted    = is_active = false (soft delete; rows still in DB)
--
-- Pick ONE section below. Comment out the others.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- A) RECOMMENDED — Soft-delete all archived items (same as the app)
--     They disappear from "Archived" and appear under "Deleted" filter.
-- ---------------------------------------------------------------------------
UPDATE items
SET
  is_active = false,
  updated_at = NOW()
WHERE is_active = true
  AND is_archived = true;

-- Optional: see how many rows were affected (run as a separate query after,
-- or use Supabase "RETURNING" in a transaction). Example preview BEFORE update:
-- SELECT COUNT(*) FROM items WHERE is_active = true AND is_archived = true;


-- ---------------------------------------------------------------------------
-- B) Only test seed rows (names starting with ARCHIVE_TEST_SEED_)
--     Soft-delete those archived seeds only:
-- ---------------------------------------------------------------------------
-- UPDATE items
-- SET is_active = false, updated_at = NOW()
-- WHERE is_active = true
--   AND is_archived = true
--   AND name LIKE 'ARCHIVE_TEST_SEED\_%' ESCAPE '\';


-- ---------------------------------------------------------------------------
-- C) Put archived items back on the active catalog (NOT delete — unarchive)
-- ---------------------------------------------------------------------------
-- UPDATE items
-- SET is_archived = false, updated_at = NOW()
-- WHERE is_active = true AND is_archived = true;


-- ---------------------------------------------------------------------------
-- D) HARD DELETE — permanently remove rows from `items`
--     WARNING: can fail if orders, cart, or other tables reference these ids.
--     Only use if you are sure nothing references them.
-- ---------------------------------------------------------------------------
-- DELETE FROM items
-- WHERE is_active = true AND is_archived = true;
