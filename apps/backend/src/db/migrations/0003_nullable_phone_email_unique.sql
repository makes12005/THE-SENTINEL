-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0003: Allow email-only users (phone becomes nullable)
-- Email gets a partial unique index so it behaves as a unique identifier.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make phone nullable (email-based users won't have a phone)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- 2. Partial unique index on email (only where email IS NOT NULL)
--    Prevents duplicate emails while still allowing rows with NULL email.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users (email)
  WHERE email IS NOT NULL;
