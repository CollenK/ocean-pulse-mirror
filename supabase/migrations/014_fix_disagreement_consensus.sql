-- 014_fix_disagreement_consensus.sql
-- Fix: when multiple users suggest the same alternative species,
-- that counts as consensus even though is_agreement = false.
-- "Agreement" should mean "people agree with each other", not just
-- "people agree with the original observer".

CREATE OR REPLACE FUNCTION compute_observation_consensus(p_observation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_observation RECORD;
  v_total_votes INTEGER;
  v_agreement_ratio NUMERIC;
  v_consensus_species TEXT;
  v_consensus_count INTEGER;
  v_new_tier quality_tier;
  v_old_tier quality_tier;
  v_has_photo BOOLEAN;
  v_has_location BOOLEAN;
  v_expert_count INTEGER;
  v_has_expert_in_consensus BOOLEAN;
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

  -- Total number of verifications
  SELECT COUNT(*)
  INTO v_total_votes
  FROM observation_verifications v
  WHERE v.observation_id = p_observation_id;

  -- Expert count across all verifications
  SELECT COUNT(*)
  INTO v_expert_count
  FROM observation_verifications v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.observation_id = p_observation_id
    AND p.is_expert = true;

  -- Find the species name that the most people agree on.
  -- Agreement votes use the original species_name (or their own if provided).
  -- Disagreement votes use their suggested species_name.
  -- We group ALL votes by the effective species they support.
  SELECT
    effective_species,
    cnt
  INTO v_consensus_species, v_consensus_count
  FROM (
    SELECT
      CASE
        WHEN v.is_agreement THEN COALESCE(v.species_name, obs.species_name)
        ELSE v.species_name
      END AS effective_species,
      COUNT(*) AS cnt
    FROM observation_verifications v
    JOIN observations obs ON obs.id = v.observation_id
    WHERE v.observation_id = p_observation_id
      AND (v.is_agreement = true OR v.species_name IS NOT NULL)
    GROUP BY effective_species
  ) grouped
  WHERE effective_species IS NOT NULL
  ORDER BY cnt DESC
  LIMIT 1;

  -- Fallback if no consensus species found
  IF v_consensus_species IS NULL THEN
    v_consensus_species := v_observation.species_name;
    v_consensus_count := 0;
  END IF;

  -- Agreement ratio = proportion of voters who support the consensus species
  IF v_total_votes > 0 THEN
    v_agreement_ratio := v_consensus_count::NUMERIC / v_total_votes;
  ELSE
    v_agreement_ratio := 0;
  END IF;

  -- Check if any expert is in the consensus group
  SELECT EXISTS(
    SELECT 1
    FROM observation_verifications v
    JOIN profiles p ON p.id = v.user_id
    WHERE v.observation_id = p_observation_id
      AND p.is_expert = true
      AND (
        (v.is_agreement = true AND COALESCE(v.species_name, v_observation.species_name) = v_consensus_species)
        OR (v.is_agreement = false AND v.species_name = v_consensus_species)
      )
  ) INTO v_has_expert_in_consensus;

  -- Determine quality tier
  IF v_total_votes = 0 THEN
    IF v_has_photo AND v_has_location AND v_observation.species_name IS NOT NULL THEN
      v_new_tier := 'needs_id';
    ELSE
      v_new_tier := 'casual';
    END IF;
  ELSIF v_consensus_count >= 2 AND v_agreement_ratio >= 0.667 THEN
    IF v_has_photo AND v_has_location AND v_has_expert_in_consensus THEN
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

  -- Notify on tier change
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

-- Recompute all observations that have verifications
DO $$
DECLARE
  obs_id UUID;
BEGIN
  FOR obs_id IN
    SELECT DISTINCT observation_id FROM observation_verifications
  LOOP
    PERFORM compute_observation_consensus(obs_id);
  END LOOP;
END;
$$;
