-- Migration: Add student profile fields to users table
-- Date: 2025-11-22
-- Description: Adds course_year_level, student_number, and education_level columns for student profiles

-- Add course_year_level column (combined course and year level)
-- Examples: "BSIS 1st Year", "Grade 10", "Kinder", "ACT 2nd Year"
ALTER TABLE users
ADD COLUMN IF NOT EXISTS course_year_level TEXT;

-- Add student_number column
-- Example: "22-11223"
ALTER TABLE users
ADD COLUMN IF NOT EXISTS student_number TEXT;

-- Add education_level column (calculated from course_year_level)
-- Values: "Kindergarten", "Elementary", "High School", "Senior High School", "College", "Vocational"
ALTER TABLE users
ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.course_year_level IS 'Combined course and year level (e.g., "BSIS 1st Year", "Grade 10", "Kinder")';
COMMENT ON COLUMN users.student_number IS 'Student identification number (e.g., "22-11223")';
COMMENT ON COLUMN users.education_level IS 'Calculated education level: Kindergarten, Elementary, High School, Senior High School, College, or Vocational';

-- Create index on education_level for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_education_level ON users(education_level);

-- Optional: Add check constraint for education_level values
ALTER TABLE users
ADD CONSTRAINT check_education_level
CHECK (education_level IS NULL OR education_level IN (
  'Kindergarten',
  'Elementary',
  'High School',
  'Senior High School',
  'College',
  'Vocational'
));

