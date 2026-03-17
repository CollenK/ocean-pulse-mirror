-- ============================================================
-- Migration 019: Fix create_observation_with_health overload
-- Drop the old 13-parameter version that conflicts with the
-- new 16-parameter version from migration 018.
-- ============================================================

-- Drop the old signature (13 params, no litter fields)
DROP FUNCTION IF EXISTS create_observation_with_health(
  TEXT, UUID, TEXT, TEXT, TEXT, INT, TEXT,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  TEXT, JSONB, INT
);
