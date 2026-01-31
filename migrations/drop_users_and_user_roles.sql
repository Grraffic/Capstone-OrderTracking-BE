-- ============================================================================
-- MIGRATION: Remove users and user_roles tables (post cutover to students/staff)
-- ============================================================================
-- Prerequisite: Data already migrated to students and staff; FKs updated.
-- 1. maintenance_mode: point created_by/updated_by to staff(id)
-- 2. transactions: drop FK to users (keep user_id as audit UUID)
-- 3. students/staff: drop legacy_user_id
-- 4. Drop user_roles, then users
-- ============================================================================

-- 1. maintenance_mode: drop FKs to users, then map users.id -> staff.id, then add FKs to staff
ALTER TABLE maintenance_mode DROP CONSTRAINT IF EXISTS maintenance_mode_created_by_fkey;
ALTER TABLE maintenance_mode DROP CONSTRAINT IF EXISTS maintenance_mode_updated_by_fkey;

UPDATE maintenance_mode mm
SET
  created_by = (SELECT s.id FROM staff s WHERE s.legacy_user_id = mm.created_by),
  updated_by = (SELECT s.id FROM staff s WHERE s.legacy_user_id = mm.updated_by)
WHERE mm.created_by IS NOT NULL OR mm.updated_by IS NOT NULL;

ALTER TABLE maintenance_mode
  ADD CONSTRAINT maintenance_mode_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE maintenance_mode
  ADD CONSTRAINT maintenance_mode_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL;

-- 2. transactions: drop FK to users (keep user_id column for historical audit)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- 3. students: drop legacy link to users
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_legacy_user_id_fkey;
ALTER TABLE students DROP COLUMN IF EXISTS legacy_user_id;

-- 4. staff: drop legacy link to users
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_legacy_user_id_fkey;
ALTER TABLE staff DROP COLUMN IF EXISTS legacy_user_id;

-- 5. Drop user_roles (references users)
DROP TABLE IF EXISTS user_roles;

-- 6. Drop users table
DROP TABLE IF EXISTS users;
