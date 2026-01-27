-- Migration: Add student enrollment and order management fields to users table
-- Date: 2025-01-26
-- Description: Adds enrollment_status, max_items_per_order, and order_lockout_period columns for student management

-- Add enrollment_status column
-- Values: 'currently_enrolled', 'eligible_for_enrollment', 'not_eligible', 'dropped_officially'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS enrollment_status TEXT;

-- Add max_items_per_order column (maximum number of items a student can order)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS max_items_per_order INTEGER;

-- Add order_lockout_period column (number of days before student can order again)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS order_lockout_period INTEGER;

-- Add check constraint for enrollment_status values
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_enrollment_status;
ALTER TABLE users
ADD CONSTRAINT check_enrollment_status
CHECK (enrollment_status IS NULL OR enrollment_status IN (
  'currently_enrolled',
  'eligible_for_enrollment',
  'not_eligible',
  'dropped_officially'
));

-- Add comments for documentation
COMMENT ON COLUMN users.enrollment_status IS 'Student enrollment status: currently_enrolled, eligible_for_enrollment, not_eligible, or dropped_officially';
COMMENT ON COLUMN users.max_items_per_order IS 'Maximum number of items a student can order in a single order';
COMMENT ON COLUMN users.order_lockout_period IS 'Number of days before student can place another order';

-- Create index on enrollment_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_enrollment_status ON users(enrollment_status);

-- Set default enrollment_status for existing students (if needed)
-- UPDATE users SET enrollment_status = 'currently_enrolled' WHERE role = 'student' AND enrollment_status IS NULL;
