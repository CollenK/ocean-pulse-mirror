-- Ocean PULSE Observations Schema
-- Migration for user observations and health assessments
-- Run this in your Supabase SQL Editor after 001_initial_schema.sql

-- ============================================
-- Report Types Enum
-- ============================================
DO $$ BEGIN
    CREATE TYPE report_type AS ENUM (
        'species_sighting',
        'habitat_condition',
        'water_quality',
        'threat_concern',
        'enforcement_activity',
        'research_observation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- User Observations Table
-- ============================================
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    mpa_id UUID REFERENCES mpas(id) ON DELETE SET NULL,

    -- Report type and details
    report_type report_type NOT NULL,
    species_name VARCHAR(255),
    species_type VARCHAR(50),
    quantity INT DEFAULT 1,
    notes TEXT,

    -- Location data
    location GEOMETRY(POINT, 4326),
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    location_accuracy_m DECIMAL(8, 2),
    location_manually_entered BOOLEAN DEFAULT FALSE,

    -- Photo evidence
    photo_url TEXT,
    photo_metadata JSONB,

    -- Health assessment (1-10 scale, stored as integer)
    health_score_assessment INT CHECK (health_score_assessment IS NULL OR (health_score_assessment >= 1 AND health_score_assessment <= 10)),

    -- Status
    is_draft BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    -- Timestamps
    observed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create PostGIS point from lat/lng on insert/update
CREATE OR REPLACE FUNCTION update_observation_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_observation_location_trigger ON observations;
CREATE TRIGGER update_observation_location_trigger
    BEFORE INSERT OR UPDATE OF latitude, longitude ON observations
    FOR EACH ROW EXECUTE FUNCTION update_observation_location();

-- Indexes for observations
CREATE INDEX IF NOT EXISTS idx_observations_user ON observations(user_id);
CREATE INDEX IF NOT EXISTS idx_observations_mpa ON observations(mpa_id);
CREATE INDEX IF NOT EXISTS idx_observations_location ON observations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_observations_report_type ON observations(report_type);
CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_draft ON observations(is_draft) WHERE is_draft = true;
CREATE INDEX IF NOT EXISTS idx_observations_health ON observations(health_score_assessment) WHERE health_score_assessment IS NOT NULL;

-- ============================================
-- User Health Assessments Table
-- Stores individual health assessments for MPAs
-- These contribute to the overall MPA health score
-- ============================================
CREATE TABLE IF NOT EXISTS user_health_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE NOT NULL,
    observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,

    -- Health score (1-10 scale)
    score INT NOT NULL CHECK (score >= 1 AND score <= 10),

    -- Optional context
    notes TEXT,

    -- Timestamps
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for health assessments
CREATE INDEX IF NOT EXISTS idx_health_assessments_user ON user_health_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_health_assessments_mpa ON user_health_assessments(mpa_id);
CREATE INDEX IF NOT EXISTS idx_health_assessments_created ON user_health_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_assessments_score ON user_health_assessments(score);

-- ============================================
-- Aggregated MPA Health View
-- For quick lookup of community health scores
-- ============================================
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

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on observations
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_health_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all observations" ON observations;
DROP POLICY IF EXISTS "Users can insert their own observations" ON observations;
DROP POLICY IF EXISTS "Users can update their own observations" ON observations;
DROP POLICY IF EXISTS "Users can delete their own observations" ON observations;
DROP POLICY IF EXISTS "Anonymous can insert observations" ON observations;

DROP POLICY IF EXISTS "Users can view all health assessments" ON user_health_assessments;
DROP POLICY IF EXISTS "Users can insert their own health assessments" ON user_health_assessments;
DROP POLICY IF EXISTS "Anonymous can insert health assessments" ON user_health_assessments;

-- Observations policies

-- Anyone can view non-draft observations (community data)
CREATE POLICY "Anyone can view published observations"
    ON observations FOR SELECT
    USING (is_draft = false);

-- Users can view their own drafts
CREATE POLICY "Users can view their own drafts"
    ON observations FOR SELECT
    USING (auth.uid() = user_id AND is_draft = true);

-- Authenticated users can insert observations
CREATE POLICY "Authenticated users can insert observations"
    ON observations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- Users can update their own observations
CREATE POLICY "Users can update their own observations"
    ON observations FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own observations
CREATE POLICY "Users can delete their own observations"
    ON observations FOR DELETE
    USING (auth.uid() = user_id);

-- Health assessments policies

-- Anyone can view health assessments (community data)
CREATE POLICY "Anyone can view health assessments"
    ON user_health_assessments FOR SELECT
    USING (true);

-- Authenticated users can insert health assessments
CREATE POLICY "Authenticated users can insert health assessments"
    ON user_health_assessments FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- Users can delete their own health assessments
CREATE POLICY "Users can delete their own health assessments"
    ON user_health_assessments FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- Functions
-- ============================================

-- Function to get community health score for an MPA
CREATE OR REPLACE FUNCTION get_mpa_community_health(p_mpa_id UUID)
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

-- Function to get recent community health trend for an MPA
CREATE OR REPLACE FUNCTION get_mpa_health_trend(
    p_mpa_id UUID,
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
-- Update triggers
-- ============================================

-- Update updated_at for observations
DROP TRIGGER IF EXISTS update_observations_updated_at ON observations;
CREATE TRIGGER update_observations_updated_at
    BEFORE UPDATE ON observations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Storage bucket for observation photos (optional)
-- Run this only if you want to use Supabase Storage
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('observation-photos', 'observation-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "Anyone can view observation photos"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'observation-photos');

-- CREATE POLICY "Authenticated users can upload observation photos"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'observation-photos' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can delete their own photos"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'observation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
