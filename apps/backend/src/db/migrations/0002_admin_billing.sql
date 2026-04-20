-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002: Admin Billing System (Sprint 9)
-- Tables: agency_billing_config, billing_transactions
-- ─────────────────────────────────────────────────────────────────────────────

-- Per-agency billing configuration
-- Stores prepaid balance (paise = ₹ * 100) and per-alert cost
CREATE TABLE IF NOT EXISTS agency_billing_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  balance_paise     BIGINT NOT NULL DEFAULT 0,          -- prepaid balance in paise
  per_alert_paise   INTEGER NOT NULL DEFAULT 200,       -- cost per alert in paise (₹2.00)
  low_balance_threshold_paise BIGINT NOT NULL DEFAULT 10000, -- ₹100 threshold
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Every balance change (top-up or deduction) is recorded here
CREATE TABLE IF NOT EXISTS billing_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  amount_paise    BIGINT NOT NULL,                      -- positive = credit, negative = debit
  balance_after_paise BIGINT NOT NULL,                  -- running balance snapshot after this tx
  type            VARCHAR(32) NOT NULL,                 -- 'topup' | 'alert_deduction'
  description     TEXT,
  reference_id    VARCHAR(255),                         -- tripId or payment reference
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS billing_tx_agency_idx ON billing_transactions(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_config_agency_idx ON agency_billing_config(agency_id);
