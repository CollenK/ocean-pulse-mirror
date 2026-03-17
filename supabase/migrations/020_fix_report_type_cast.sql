-- ============================================================
-- Migration 020: Fix report_type TEXT->enum cast
-- The create_observation_with_health function receives
-- p_report_type as TEXT but observations.report_type is an
-- enum. Add explicit cast to prevent type mismatch error.
-- ============================================================

CREATE OR REPLACE FUNCTION create_observation_with_health(
  p_mpa_id TEXT,
  p_user_id UUID,
  p_report_type TEXT,
  p_species_name TEXT DEFAULT NULL,
  p_species_type TEXT DEFAULT NULL,
  p_quantity INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_location_accuracy_m DOUBLE PRECISION DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_photo_metadata JSONB DEFAULT NULL,
  p_health_score INT DEFAULT NULL,
  p_litter_items JSONB DEFAULT NULL,
  p_litter_weight_kg NUMERIC DEFAULT NULL,
  p_survey_length_m INT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_observation_id UUID;
BEGIN
  -- Insert the observation (explicit cast TEXT -> report_type enum)
  INSERT INTO observations (
    mpa_id, user_id, report_type, species_name, species_type,
    quantity, notes, latitude, longitude, location_accuracy_m,
    location_manually_entered, photo_url, photo_metadata,
    health_score_assessment, is_draft, synced_at,
    litter_items, litter_weight_kg, survey_length_m
  ) VALUES (
    p_mpa_id, p_user_id, p_report_type::report_type, p_species_name, p_species_type,
    p_quantity, p_notes, p_latitude, p_longitude, p_location_accuracy_m,
    true, p_photo_url, p_photo_metadata,
    p_health_score, false, NOW(),
    p_litter_items, p_litter_weight_kg, p_survey_length_m
  )
  RETURNING id INTO v_observation_id;

  -- Insert health assessment if score provided
  IF p_health_score IS NOT NULL AND p_user_id IS NOT NULL THEN
    INSERT INTO user_health_assessments (mpa_id, user_id, observation_id, score)
    VALUES (p_mpa_id, p_user_id, v_observation_id, p_health_score);
  END IF;

  RETURN v_observation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
