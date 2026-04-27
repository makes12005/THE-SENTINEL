-- ============================================================
-- Migration: 0005_resources_member_metadata
-- Adds: users.added_by metadata and route uniqueness per agency
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS routes_agency_name_unique
  ON routes(agency_id, name);
