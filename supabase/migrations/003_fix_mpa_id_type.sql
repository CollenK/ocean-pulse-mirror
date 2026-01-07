-- Fix mpa_id type in observations and user_health_assessments
-- Change from UUID to TEXT to match the string MPA IDs used in the app

-- ============================================
-- Drop views that depend on mpa_id first
-- ============================================
DROP VIEW IF EXISTS mpa_community_health;

-- ============================================
-- Drop existing foreign key constraints
-- ============================================
ALTER TABLE observations DROP CONSTRAINT IF EXISTS observations_mpa_id_fkey;
ALTER TABLE user_health_assessments DROP CONSTRAINT IF EXISTS user_health_assessments_mpa_id_fkey;

-- ============================================
-- Change mpa_id column type from UUID to TEXT
-- ============================================
ALTER TABLE observations ALTER COLUMN mpa_id TYPE TEXT;
ALTER TABLE user_health_assessments ALTER COLUMN mpa_id TYPE TEXT;

-- ============================================
-- Update the health functions to use TEXT
-- ============================================
DROP FUNCTION IF EXISTS get_mpa_community_health(UUID);
DROP FUNCTION IF EXISTS get_mpa_health_trend(UUID, INT);

CREATE OR REPLACE FUNCTION get_mpa_community_health(p_mpa_id TEXT)
RETURNS TABLE (
    average_score DECIMAL,
    assessment_count BIGINT,
    min_score INT,
    max_score INT,
    last_assessment TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(AVG(score)::numeric, 2) as average_score,
        COUNT(*) as assessment_count,
        MIN(score) as min_score,
        MAX(score) as max_score,
        MAX(assessed_at) as last_assessment
    FROM user_health_assessments
    WHERE mpa_id = p_mpa_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_mpa_health_trend(
    p_mpa_id TEXT,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    period_start DATE,
    average_score DECIMAL,
    assessment_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE_TRUNC('day', assessed_at)::DATE as period_start,
        ROUND(AVG(score)::numeric, 2) as average_score,
        COUNT(*) as assessment_count
    FROM user_health_assessments
    WHERE mpa_id = p_mpa_id
      AND assessed_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY DATE_TRUNC('day', assessed_at)
    ORDER BY period_start DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Recreate the mpa_community_health view
-- ============================================
DROP VIEW IF EXISTS mpa_community_health;
CREATE OR REPLACE VIEW mpa_community_health AS
SELECT
    mpa_id,
    COUNT(*) as assessment_count,
    ROUND(AVG(score)::numeric, 2) as average_score,
    MIN(score) as min_score,
    MAX(score) as max_score,
    ROUND(STDDEV(score)::numeric, 2) as score_stddev,
    MAX(assessed_at) as last_assessment_at
FROM user_health_assessments
GROUP BY mpa_id;
