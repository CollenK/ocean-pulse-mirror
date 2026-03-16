-- 013_fix_consensus_species_logic.sql
-- Update compute_observation_consensus to surface disagreement suggestions
-- when no agreement votes exist yet.

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

  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN p.is_expert THEN 2 ELSE 1 END) FILTER (WHERE v.is_agreement), 0),
    COALESCE(SUM(CASE WHEN p.is_expert THEN 2 ELSE 1 END), 0),
    COUNT(*) FILTER (WHERE p.is_expert)
  INTO v_total_votes, v_weighted_agreements, v_weighted_total, v_expert_count
  FROM observation_verifications v
  JOIN profiles p ON p.id = v.user_id
  WHERE v.observation_id = p_observation_id;

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

  IF v_total_votes = 0 THEN
    IF v_has_photo AND v_has_location AND v_observation.species_name IS NOT NULL THEN
      v_new_tier := 'needs_id';
    ELSE
      v_new_tier := 'casual';
    END IF;
  ELSIF v_total_votes >= 2 AND v_agreement_ratio >= 0.667 THEN
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

  UPDATE observations
  SET quality_tier = v_new_tier,
      community_species_name = v_consensus_species,
      updated_at = now()
  WHERE id = p_observation_id;

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

-- Recompute consensus for any observations that already have verifications,
-- so existing disagreement suggestions get surfaced
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
