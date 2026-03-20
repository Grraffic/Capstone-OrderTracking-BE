-- Add account status column for students to support active/inactive access control.
ALTER TABLE students
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Ensure only valid status values are allowed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_students_status'
  ) THEN
    ALTER TABLE students
    ADD CONSTRAINT check_students_status
    CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Index for status filtering and account-state reads.
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
