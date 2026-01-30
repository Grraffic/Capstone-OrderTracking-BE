-- Track unclaimed (auto-voided) order strikes per student. After 3 strikes, block (max_items_per_order = 0).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS unclaimed_void_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.unclaimed_void_count IS 'Number of unclaimed (auto-voided) orders. After 3, student is blocked until admin sets max_items_per_order again.';
