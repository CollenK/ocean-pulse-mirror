-- ============================================================
-- Migration 016: Gamification System
-- Achievement badges, observation streaks, species collection,
-- and leaderboard support
-- ============================================================

-- 1. user_badges: tracks which badges each user has earned
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- 2. user_streaks: tracks observation streaks per user
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_observation_date DATE
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Badges are publicly readable (leaderboards, profile views)
CREATE POLICY "user_badges_select" ON user_badges
  FOR SELECT USING (true);

-- Only the system (SECURITY DEFINER functions) inserts badges
CREATE POLICY "user_badges_insert" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks are publicly readable
CREATE POLICY "user_streaks_select" ON user_streaks
  FOR SELECT USING (true);

-- Users can insert their own streak row
CREATE POLICY "user_streaks_insert" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak row
CREATE POLICY "user_streaks_update" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- View: user_species_collection
-- Aggregates observations by user and species_name
-- ============================================================

CREATE OR REPLACE VIEW user_species_collection AS
SELECT
  o.user_id,
  o.species_name,
  MIN(o.observed_at) AS first_seen_at,
  COUNT(*)::INT AS observation_count,
  (ARRAY_AGG(o.mpa_id ORDER BY o.observed_at DESC))[1] AS mpa_id,
  (ARRAY_AGG(m.name ORDER BY o.observed_at DESC))[1] AS mpa_name
FROM observations o
LEFT JOIN mpas m ON m.id::TEXT = o.mpa_id
WHERE o.species_name IS NOT NULL
  AND o.species_name != ''
  AND o.is_draft = false
GROUP BY o.user_id, o.species_name;

-- ============================================================
-- RPC: update_observation_streak
-- Called after observation creation to maintain streak
-- ============================================================

CREATE OR REPLACE FUNCTION update_observation_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_date DATE;
  v_current INT;
  v_longest INT;
BEGIN
  -- Get existing streak data
  SELECT last_observation_date, current_streak, longest_streak
  INTO v_last_date, v_current, v_longest
  FROM user_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- First observation ever: create streak row
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_observation_date)
    VALUES (p_user_id, 1, 1, v_today);
    RETURN;
  END IF;

  -- Already recorded today
  IF v_last_date = v_today THEN
    RETURN;
  END IF;

  IF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day: increment streak
    v_current := v_current + 1;
  ELSE
    -- Streak broken: reset to 1
    v_current := 1;
  END IF;

  -- Update longest if current exceeds it
  IF v_current > v_longest THEN
    v_longest := v_current;
  END IF;

  UPDATE user_streaks
  SET current_streak = v_current,
      longest_streak = v_longest,
      last_observation_date = v_today
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================================
-- RPC: check_and_award_badges
-- Checks all badge conditions and awards any newly earned ones.
-- Returns array of newly earned badge IDs.
-- ============================================================

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

-- ============================================================
-- RPC: get_leaderboard
-- Returns ranked list of users by type and period
-- ============================================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_type TEXT,
  p_period TEXT,
  p_mpa_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  score BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_type = 'observations' THEN
    RETURN QUERY
    SELECT
      o.user_id,
      COALESCE(p.display_name, 'Anonymous')::TEXT AS display_name,
      p.avatar_url::TEXT,
      COUNT(*)::BIGINT AS score,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)::BIGINT AS rank
    FROM observations o
    LEFT JOIN profiles p ON p.id = o.user_id
    WHERE o.is_draft = false
      AND (p_mpa_id IS NULL OR o.mpa_id = p_mpa_id::TEXT)
      AND (p_period != 'monthly' OR o.observed_at >= date_trunc('month', CURRENT_DATE))
    GROUP BY o.user_id, p.display_name, p.avatar_url
    ORDER BY score DESC
    LIMIT p_limit;

  ELSIF p_type = 'species' THEN
    RETURN QUERY
    SELECT
      o.user_id,
      COALESCE(p.display_name, 'Anonymous')::TEXT AS display_name,
      p.avatar_url::TEXT,
      COUNT(DISTINCT o.species_name)::BIGINT AS score,
      ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT o.species_name) DESC)::BIGINT AS rank
    FROM observations o
    LEFT JOIN profiles p ON p.id = o.user_id
    WHERE o.is_draft = false
      AND o.species_name IS NOT NULL AND o.species_name != ''
      AND (p_mpa_id IS NULL OR o.mpa_id = p_mpa_id::TEXT)
      AND (p_period != 'monthly' OR o.observed_at >= date_trunc('month', CURRENT_DATE))
    GROUP BY o.user_id, p.display_name, p.avatar_url
    ORDER BY score DESC
    LIMIT p_limit;

  ELSIF p_type = 'verifications' THEN
    RETURN QUERY
    SELECT
      v.user_id,
      COALESCE(p.display_name, 'Anonymous')::TEXT AS display_name,
      p.avatar_url::TEXT,
      COUNT(*)::BIGINT AS score,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)::BIGINT AS rank
    FROM observation_verifications v
    LEFT JOIN profiles p ON p.id = v.user_id
    WHERE (p_period != 'monthly' OR v.created_at >= date_trunc('month', CURRENT_DATE))
    GROUP BY v.user_id, p.display_name, p.avatar_url
    ORDER BY score DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- ============================================================
-- Trigger: after INSERT on observations (non-draft)
-- Updates streak and checks for new badges
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_gamification_on_observation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_draft = false AND NEW.user_id IS NOT NULL THEN
    PERFORM update_observation_streak(NEW.user_id);
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gamification_on_observation ON observations;
CREATE TRIGGER trg_gamification_on_observation
  AFTER INSERT ON observations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gamification_on_observation();

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
