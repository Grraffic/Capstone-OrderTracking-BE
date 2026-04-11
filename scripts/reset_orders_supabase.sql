-- ============================================================================
-- Reset all orders (including claimed) — Supabase SQL Editor
-- ============================================================================
-- Claimed orders are rows with status = 'claimed' (and 'completed' for done).
-- This script removes order rows so dashboards / students start clean.
--
-- IMPORTANT:
--   • This does NOT automatically put stock back on items. If you deleted
--     orders that had already reduced inventory, fix stock manually or only
--     use this on a dev / empty DB.
--   • Run as a role that bypasses RLS (e.g. service role) if DELETE is blocked.
--   • Pick ONE primary option (A or B). C–E are optional add-ons.
-- ============================================================================

-- Preview (run alone first if you want counts)
-- SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY status;
-- SELECT COUNT(*) AS total_orders FROM orders;


-- ---------------------------------------------------------------------------
-- A) RECOMMENDED — Remove every order row (pending, paid, claimed, completed, …)
-- ---------------------------------------------------------------------------
DELETE FROM orders;


-- ---------------------------------------------------------------------------
-- B) Alternative — Soft-delete all orders (rows stay; is_active = false)
--     Uncomment ONLY if you prefer this instead of A (comment out A above).
-- ---------------------------------------------------------------------------
-- UPDATE orders SET is_active = false, updated_at = NOW() WHERE is_active = true;


-- ---------------------------------------------------------------------------
-- C) Optional — Remove transaction log rows for orders (type = Order)
--     Uncomment after A/B if you want the transaction list clean too.
--     (Keeps Inventory / Item / User transactions if any.)
-- ---------------------------------------------------------------------------
-- DELETE FROM transactions WHERE type = 'Order';


-- ---------------------------------------------------------------------------
-- D) Optional — Reset “unclaimed void” strikes (after orders are gone)
--     Uncomment the line(s) that match your schema (users and/or students).
-- ---------------------------------------------------------------------------
-- UPDATE users SET unclaimed_void_count = 0 WHERE unclaimed_void_count IS NOT NULL;
-- UPDATE students SET unclaimed_void_count = 0 WHERE unclaimed_void_count IS NOT NULL;


-- ---------------------------------------------------------------------------
-- E) Optional — Truncate instead of DELETE (same effect; resets storage fast)
--     Use INSTEAD of A, not together. Uncomment E and comment out A.
-- ---------------------------------------------------------------------------
-- TRUNCATE TABLE orders RESTART IDENTITY;


-- Verify
SELECT COUNT(*) AS orders_remaining FROM orders;
