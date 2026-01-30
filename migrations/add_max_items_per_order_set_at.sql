-- When a system admin sets or updates max_items_per_order for a student, we set this timestamp.
-- "Used" (slots_used_from_placed_orders) only counts orders created AFTER this time, so the student gets a fresh slate (e.g. "2 left (0 used)").

ALTER TABLE users
ADD COLUMN IF NOT EXISTS max_items_per_order_set_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN users.max_items_per_order_set_at IS 'When max_items_per_order was last set/updated by admin; only orders created after this time count toward slots used.';
