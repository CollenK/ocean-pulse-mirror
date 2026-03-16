-- 012_verification_system.sql
-- Observation Verification & Community Validation System
-- Adds iNaturalist-style community verification to observations

-- 1. Create quality_tier enum
CREATE TYPE quality_tier AS ENUM ('casual', 'needs_id', 'community_verified', 'research_grade');

-- 2. Add columns to observations
ALTER TABLE observations
  ADD COLUMN quality_tier quality_tier NOT NULL DEFAULT 'casual',
  ADD COLUMN community_species_name TEXT;

-- 3. Create observation_verifications table
CREATE TABLE observation_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_name TEXT,
  is_agreement BOOLEAN NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(observation_id, user_id)
);

-- 4. Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add is_expert to profiles
ALTER TABLE profiles
  ADD COLUMN is_expert BOOLEAN NOT NULL DEFAULT false;

-- 6. Indexes
CREATE INDEX idx_verifications_observation_id ON observation_verifications(observation_id);
CREATE INDEX idx_verifications_user_id ON observation_verifications(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_observations_quality_tier ON observations(quality_tier);

-- 7. RLS Policies

-- observation_verifications
ALTER TABLE observation_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verifications are publicly readable"
  ON observation_verifications FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert verifications (not own observations)"
  ON observation_verifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND observation_id NOT IN (
      SELECT id FROM observations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own verifications"
  ON observation_verifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verifications"
  ON observation_verifications FOR DELETE
  USING (auth.uid() = user_id);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 8. compute_observation_consensus RPC
CREATE OR REPLACE FUNCTION compute_observation_consensus(p_observation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_observation RECORD;
  v_total_votes INTEGER;
  v_weighted_agreements NUMERIC;
  v_weighted_total NUMERIC;
  v_agreement_ratio NUMERIC;
  v_consensus_species TEXT;
  v_new_tier quality_tier;
  v_old_tier quality_tier;
  v_has_photo BOOLEAN;
  v_has_location BOOLEAN;
  v_expert_count INTEGER;
BEGIN
  -- Get observation details
  SELECT o.*, o.quality_tier AS current_tier
  INTO v_observation
  FROM observations o
  WHERE o.id = p_observation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Observation not found');
  END IF;

  v_has_photo := v_observation.photo_url IS NOT NULL;
  v_has_location := v_observation.latitude IS NOT NULL;
  v_old_tier := v_observation.current_tier;

  -- Count votes (expert votes weighted 2x)
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN p.is_expert THEN 2 ELSE 1 END) FILTER (WHERE v.is_agreement), 0),
    COALESCE(SUM(CASE WHEN p.is_expert THEN 2 ELSE 1 END), 0),
    COUNT(*) FILTER (WHERE p.is_expert)
  INTO v_total_votes, v_weighted_agreements, v_weighted_total, v_expert_count
  FROM observation_verifications v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.observation_id = p_observation_id;

  -- Calculate agreement ratio
  IF v_weighted_total > 0 THEN
    v_agreement_ratio := v_weighted_agreements::NUMERIC / v_weighted_total;
  ELSE
    v_agreement_ratio := 0;
  END IF;

  -- Determine consensus species
  -- First: most agreed-upon species name from agreement votes
  SELECT v.species_name INTO v_consensus_species
  FROM observation_verifications v
  WHERE v.observation_id = p_observation_id
    AND v.is_agreement = true
    AND v.species_name IS NOT NULL
  GROUP BY v.species_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Second: if no agreement votes, use the most-suggested alternative
  IF v_consensus_species IS NULL THEN
    SELECT v.species_name INTO v_consensus_species
    FROM observation_verifications v
    WHERE v.observation_id = p_observation_id
      AND v.is_agreement = false
      AND v.species_name IS NOT NULL
    GROUP BY v.species_name
    ORDER BY COUNT(*) DESC
    LIMIT 1;
  END IF;

  -- Final fallback: original observer species name
  IF v_consensus_species IS NULL THEN
    v_consensus_species := v_observation.species_name;
  END IF;

  -- Determine quality tier
  IF v_total_votes = 0 THEN
    -- No votes yet
    IF v_has_photo AND v_has_location AND v_observation.species_name IS NOT NULL THEN
      v_new_tier := 'needs_id';
    ELSE
      v_new_tier := 'casual';
    END IF;
  ELSIF v_total_votes >= 2 AND v_agreement_ratio >= 0.667 THEN
    -- 2+ votes with 2/3 agreement
    IF v_has_photo AND v_has_location AND v_expert_count >= 1 THEN
      v_new_tier := 'research_grade';
    ELSE
      v_new_tier := 'community_verified';
    END IF;
  ELSIF v_total_votes >= 1 THEN
    v_new_tier := 'needs_id';
  ELSE
    v_new_tier := 'casual';
  END IF;

  -- Update observation
  UPDATE observations
  SET quality_tier = v_new_tier,
      community_species_name = v_consensus_species,
      updated_at = now()
  WHERE id = p_observation_id;

  -- Create tier-upgrade notification if tier changed upward
  IF v_new_tier != v_old_tier AND v_observation.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_observation.user_id,
      'tier_upgrade',
      'Observation upgraded to ' || REPLACE(v_new_tier::TEXT, '_', ' '),
      'Your observation has been verified by the community.',
      jsonb_build_object(
        'observation_id', p_observation_id,
        'old_tier', v_old_tier::TEXT,
        'new_tier', v_new_tier::TEXT
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'observation_id', p_observation_id,
    'total_votes', v_total_votes,
    'agreement_ratio', v_agreement_ratio,
    'consensus_species', v_consensus_species,
    'quality_tier', v_new_tier::TEXT,
    'expert_count', v_expert_count
  );
END;
$$;

-- 9. submit_verification RPC
CREATE OR REPLACE FUNCTION submit_verification(
  p_observation_id UUID,
  p_user_id UUID,
  p_species_name TEXT,
  p_is_agreement BOOLEAN,
  p_confidence INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_observation RECORD;
  v_result JSONB;
BEGIN
  -- Validate: cannot verify own observation
  SELECT * INTO v_observation
  FROM observations
  WHERE id = p_observation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Observation not found');
  END IF;

  IF v_observation.user_id = p_user_id THEN
    RETURN jsonb_build_object('error', 'Cannot verify your own observation');
  END IF;

  -- Upsert verification
  INSERT INTO observation_verifications (observation_id, user_id, species_name, is_agreement, confidence, notes)
  VALUES (p_observation_id, p_user_id, p_species_name, p_is_agreement, p_confidence, p_notes)
  ON CONFLICT (observation_id, user_id)
  DO UPDATE SET
    species_name = EXCLUDED.species_name,
    is_agreement = EXCLUDED.is_agreement,
    confidence = EXCLUDED.confidence,
    notes = EXCLUDED.notes,
    updated_at = now();

  -- Notify the observer
  IF v_observation.user_id IS NOT NULL AND v_observation.user_id != p_user_id THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_observation.user_id,
      'new_verification',
      CASE WHEN p_is_agreement THEN 'Someone agreed with your ID' ELSE 'Someone suggested a different ID' END,
      CASE WHEN p_is_agreement THEN 'A community member confirmed your species identification.'
           ELSE 'A community member suggested: ' || COALESCE(p_species_name, 'unknown') END,
      jsonb_build_object(
        'observation_id', p_observation_id,
        'is_agreement', p_is_agreement,
        'species_name', p_species_name
      )
    );
  END IF;

  -- Recompute consensus
  v_result := compute_observation_consensus(p_observation_id);

  RETURN v_result;
END;
$$;

-- 10. user_verification_stats view
CREATE OR REPLACE VIEW user_verification_stats AS
SELECT
  v.user_id,
  COUNT(*) AS total_verifications,
  COUNT(*) FILTER (WHERE v.is_agreement) AS agreements,
  COUNT(*) FILTER (WHERE NOT v.is_agreement) AS suggestions,
  ROUND(AVG(v.confidence), 1) AS avg_confidence,
  COUNT(DISTINCT v.observation_id) AS observations_reviewed
FROM observation_verifications v
GROUP BY v.user_id;

-- 11. Trigger to auto-set quality_tier on INSERT
CREATE OR REPLACE FUNCTION set_initial_quality_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.photo_url IS NOT NULL AND NEW.latitude IS NOT NULL AND NEW.species_name IS NOT NULL THEN
    NEW.quality_tier := 'needs_id';
  ELSE
    NEW.quality_tier := 'casual';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_initial_quality_tier
  BEFORE INSERT ON observations
  FOR EACH ROW
  EXECUTE FUNCTION set_initial_quality_tier();

-- 12. Backfill existing observations
UPDATE observations
SET quality_tier = CASE
  WHEN photo_url IS NOT NULL AND latitude IS NOT NULL AND species_name IS NOT NULL THEN 'needs_id'::quality_tier
  ELSE 'casual'::quality_tier
END
WHERE quality_tier = 'casual';
