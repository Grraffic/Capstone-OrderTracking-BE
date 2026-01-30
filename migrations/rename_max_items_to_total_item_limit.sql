-- Rename max_items_per_order to total_item_limit and max_items_per_order_set_at to total_item_limit_set_at
-- Run this after add_student_enrollment_fields.sql and add_max_items_per_order_set_at.sql

ALTER TABLE users RENAME COLUMN max_items_per_order TO total_item_limit;
ALTER TABLE users RENAME COLUMN max_items_per_order_set_at TO total_item_limit_set_at;

COMMENT ON COLUMN users.total_item_limit IS 'Total item type (slot) limit for the student; only placed orders count toward this limit';
COMMENT ON COLUMN users.total_item_limit_set_at IS 'When total_item_limit was last set/updated by admin; only orders created after this time count toward slots used.';
