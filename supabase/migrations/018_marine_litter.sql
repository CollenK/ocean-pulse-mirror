-- ============================================================
-- Migration 018: Marine Litter Monitoring
-- Adds marine_litter report type, litter-specific columns,
-- and litter gamification badges
-- ============================================================

-- 1. Add marine_litter to report_type enum
ALTER TYPE report_type ADD VALUE IF NOT EXISTS 'marine_litter';

-- 2. Add litter-specific columns to observations
ALTER TABLE observations
  ADD COLUMN IF NOT EXISTS litter_items JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS litter_weight_kg NUMERIC(8,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS survey_length_m INT DEFAULT NULL;

-- Add constraint for valid survey lengths
ALTER TABLE observations
  ADD CONSTRAINT observations_survey_length_check
  CHECK (survey_length_m IS NULL OR survey_length_m IN (10, 50, 100));

-- Add constraint for non-negative weight
ALTER TABLE observations
  ADD CONSTRAINT observations_litter_weight_check
  CHECK (litter_weight_kg IS NULL OR litter_weight_kg >= 0);

-- 3. Update create_observation_with_health to accept litter fields
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
  -- Insert the observation
  INSERT INTO observations (
    mpa_id, user_id, report_type, species_name, species_type,
    quantity, notes, latitude, longitude, location_accuracy_m,
    location_manually_entered, photo_url, photo_metadata,
    health_score_assessment, is_draft, synced_at,
    litter_items, litter_weight_kg, survey_length_m
  ) VALUES (
    p_mpa_id, p_user_id, p_report_type, p_species_name, p_species_type,
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

GRANT EXECUTE ON FUNCTION create_observation_with_health(
  TEXT, UUID, TEXT, TEXT, TEXT, INT, TEXT,
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  TEXT, JSONB, INT, JSONB, NUMERIC, INT
) TO authenticated;

-- 4. Update check_and_award_badges to include litter badges
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obs_count INT;
  v_species_count INT;
  v_verification_count INT;
  v_night_count INT;
  v_current_streak INT;
  v_litter_count INT;
  v_new_badges TEXT[] := '{}';
  v_badge_id TEXT;
  v_badge_name TEXT;
BEGIN
  -- Count total non-draft observations
  SELECT COUNT(*) INTO v_obs_count
  FROM observations
  WHERE user_id = p_user_id AND is_draft = false;

  -- Count distinct species observed
  SELECT COUNT(DISTINCT species_name) INTO v_species_count
  FROM observations
  WHERE user_id = p_user_id AND is_draft = false
    AND species_name IS NOT NULL AND species_name != '';

  -- Count verifications submitted
  SELECT COUNT(*) INTO v_verification_count
  FROM observation_verifications
  WHERE user_id = p_user_id;

  -- Count night observations (8pm to 6am)
  SELECT COUNT(*) INTO v_night_count
  FROM observations
  WHERE user_id = p_user_id AND is_draft = false
    AND (EXTRACT(HOUR FROM observed_at::timestamptz) >= 20
      OR EXTRACT(HOUR FROM observed_at::timestamptz) < 6);

  -- Count marine litter reports
  SELECT COUNT(*) INTO v_litter_count
  FROM observations
  WHERE user_id = p_user_id AND is_draft = false
    AND report_type = 'marine_litter';

  -- Get current streak
  SELECT current_streak INTO v_current_streak
  FROM user_streaks
  WHERE user_id = p_user_id;

  IF v_current_streak IS NULL THEN
    v_current_streak := 0;
  END IF;

  -- Check each badge condition and award if not already earned

  -- Observation badges
  IF v_obs_count >= 1 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'first_splash';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'first_splash');
      v_new_badges := array_append(v_new_badges, 'first_splash');
    END IF;
  END IF;

  IF v_obs_count >= 10 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'sharp_eye';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'sharp_eye');
      v_new_badges := array_append(v_new_badges, 'sharp_eye');
    END IF;
  END IF;

  IF v_obs_count >= 50 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'reef_guardian';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'reef_guardian');
      v_new_badges := array_append(v_new_badges, 'reef_guardian');
    END IF;
  END IF;

  IF v_obs_count >= 100 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'citizen_scientist';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'citizen_scientist');
      v_new_badges := array_append(v_new_badges, 'citizen_scientist');
    END IF;
  END IF;

  -- Night watch badge
  IF v_night_count >= 5 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'night_watch';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'night_watch');
      v_new_badges := array_append(v_new_badges, 'night_watch');
    END IF;
  END IF;

  -- Collection badges
  IF v_species_count >= 10 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'species_spotter';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'species_spotter');
      v_new_badges := array_append(v_new_badges, 'species_spotter');
    END IF;
  END IF;

  IF v_species_count >= 50 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'deep_diver';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'deep_diver');
      v_new_badges := array_append(v_new_badges, 'deep_diver');
    END IF;
  END IF;

  -- Streak badge
  IF v_current_streak >= 7 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'streak_master';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'streak_master');
      v_new_badges := array_append(v_new_badges, 'streak_master');
    END IF;
  END IF;

  -- Verification badge
  IF v_verification_count >= 25 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'data_champion';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'data_champion');
      v_new_badges := array_append(v_new_badges, 'data_champion');
    END IF;
  END IF;

  -- Litter badges
  IF v_litter_count >= 1 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'beach_guardian';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'beach_guardian');
      v_new_badges := array_append(v_new_badges, 'beach_guardian');
    END IF;
  END IF;

  IF v_litter_count >= 10 THEN
    PERFORM 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = 'litter_tracker';
    IF NOT FOUND THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, 'litter_tracker');
      v_new_badges := array_append(v_new_badges, 'litter_tracker');
    END IF;
  END IF;

  -- Create notifications for newly earned badges
  FOREACH v_badge_id IN ARRAY v_new_badges
  LOOP
    v_badge_name := CASE v_badge_id
      WHEN 'first_splash' THEN 'First Splash'
      WHEN 'sharp_eye' THEN 'Sharp Eye'
      WHEN 'reef_guardian' THEN 'Reef Guardian'
      WHEN 'species_spotter' THEN 'Species Spotter'
      WHEN 'deep_diver' THEN 'Deep Diver'
      WHEN 'streak_master' THEN 'Streak Master'
      WHEN 'data_champion' THEN 'Data Champion'
      WHEN 'night_watch' THEN 'Night Watch'
      WHEN 'citizen_scientist' THEN 'Citizen Scientist'
      WHEN 'beach_guardian' THEN 'Beach Guardian'
      WHEN 'litter_tracker' THEN 'Litter Tracker'
      ELSE v_badge_id
    END;

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      p_user_id,
      'badge_earned',
      'Badge Earned: ' || v_badge_name,
      'Congratulations! You have earned the "' || v_badge_name || '" badge.',
      jsonb_build_object('badge_id', v_badge_id)
    );
  END LOOP;

  RETURN v_new_badges;
END;
$$;

-- 5. Index for litter report queries
-- Note: partial index using the new enum value must be created in a separate
-- transaction from ALTER TYPE ... ADD VALUE. We use a general index instead.
CREATE INDEX IF NOT EXISTS idx_observations_litter
  ON observations(user_id, report_type)
  WHERE is_draft = false;
