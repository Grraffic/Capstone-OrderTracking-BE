-- Migration: Add gender and student_type to users table for max-order-per-item rules
-- Date: 2026-01-27
-- Purpose: Enables segment-based max quantity (education_level × student_type × gender)

-- Add gender column (Male/Female for segment rules; nullable for "prefer not to say")
ALTER TABLE users
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_gender;
ALTER TABLE users
ADD CONSTRAINT check_gender
CHECK (gender IS NULL OR gender IN ('Male', 'Female'));

COMMENT ON COLUMN users.gender IS 'Student gender for max-order-per-item rules: Male, Female, or null';

-- Add student_type column (new/old)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS student_type TEXT;

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_student_type;
ALTER TABLE users
ADD CONSTRAINT check_student_type
CHECK (student_type IS NULL OR student_type IN ('new', 'old'));

COMMENT ON COLUMN users.student_type IS 'Student type for max-order-per-item rules: new or old';

CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_student_type ON users(student_type);
