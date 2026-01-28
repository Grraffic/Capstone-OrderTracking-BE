-- ============================================================================
-- Migration: Add Student Onboarding Fields (Users)
-- ============================================================================
-- Date: 2026-01-28
--
-- Purpose:
-- Track whether a student has completed the first-time onboarding flow
-- (finishing required User Settings fields) so we can:
-- - force first-time users to complete settings before ordering
-- - skip onboarding on subsequent logins (go straight to product catalog)
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed
  ON users(onboarding_completed);

COMMENT ON COLUMN users.onboarding_completed IS 'True when student completed required onboarding/profile fields (settings) and can proceed to ordering.';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when onboarding_completed was first set to true.';

