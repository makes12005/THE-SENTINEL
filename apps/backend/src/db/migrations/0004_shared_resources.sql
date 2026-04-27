-- ============================================================
-- Migration: 0004_shared_resources
-- Adds: buses table, trip assignment columns, staff phone
--       uniqueness per agency (conductor/driver)
-- ============================================================

-- 1. Buses table — shared agency resource
CREATE TABLE IF NOT EXISTS buses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES agencies(id),
  number_plate  VARCHAR(20) NOT NULL,
  model         VARCHAR(255),
  capacity      INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  added_by      UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique bus plate per agency
CREATE UNIQUE INDEX IF NOT EXISTS buses_agency_plate_unique
  ON buses(agency_id, number_plate);

-- Index for agency scoped queries
CREATE INDEX IF NOT EXISTS buses_agency_idx
  ON buses(agency_id);

-- 2. Trip assignment columns
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS assigned_to_operator_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES buses(id);

-- Index for trips visible to an assigned operator
CREATE INDEX IF NOT EXISTS trips_assigned_operator_idx
  ON trips(assigned_to_operator_id)
  WHERE assigned_to_operator_id IS NOT NULL;

-- 3. Drop old global phone unique constraint on users (if it exists)
--    We replace it with partial unique per-agency for conductor/driver roles.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_unique;

-- 4. Fix agency phone length (was too short for E.164)
ALTER TABLE agencies ALTER COLUMN phone TYPE VARCHAR(20);

-- 5. Partial unique index: same phone cannot be added twice as
--    conductor OR driver within the same agency.
CREATE UNIQUE INDEX IF NOT EXISTS users_agency_phone_staff_unique
  ON users(agency_id, phone)
  WHERE role IN ('conductor', 'driver') AND phone IS NOT NULL;

-- 5. Non-unique index on phone for login lookups (admin/owner/operator have globally unique phones enforced at app layer)
CREATE INDEX IF NOT EXISTS users_phone_idx
  ON users(phone)
  WHERE phone IS NOT NULL;
