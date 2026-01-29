-- Add student_confirmed_at to orders for 10-second claim window (testing).
-- When set, the order was "claimed" by the student within the time window and will not be auto-voided.
-- Auto-voided orders (notes LIKE 'Auto-voided%') block the student from placing new orders.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS student_confirmed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN orders.student_confirmed_at IS 'When the student confirmed/claimed the order within the claim window; NULL = not yet confirmed, can be auto-voided.';
