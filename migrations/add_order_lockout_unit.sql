-- Migration: Add order_lockout_unit to users table
-- Purpose: Store unit for order_lockout_period (months or academic_years)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS order_lockout_unit TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_order_lockout_unit;
ALTER TABLE users
ADD CONSTRAINT check_order_lockout_unit
CHECK (order_lockout_unit IS NULL OR order_lockout_unit IN ('months', 'academic_years'));

COMMENT ON COLUMN users.order_lockout_unit IS 'Unit for order_lockout_period: months or academic_years';
