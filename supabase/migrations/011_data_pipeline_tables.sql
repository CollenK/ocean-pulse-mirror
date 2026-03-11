-- Migration: 011_data_pipeline_tables
-- Creates tables for storing pre-fetched OBIS data so the frontend reads
-- from Supabase instead of calling OBIS APIs directly.

-- =============================================================================
-- 1. population_trends - Per-species abundance trend data per MPA
-- =============================================================================
CREATE TABLE population_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id TEXT NOT NULL REFERENCES mpas(external_id) ON DELETE CASCADE,
    scientific_name TEXT NOT NULL,
    common_name TEXT,
    trend TEXT NOT NULL CHECK (trend IN ('increasing', 'stable', 'decreasing', 'insufficient_data')),
    change_percent NUMERIC,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    data_points JSONB NOT NULL DEFAULT '[]',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (mpa_id, scientific_name)
);

-- =============================================================================
-- 2. mpa_abundance_summaries - Aggregated abundance per MPA
-- =============================================================================
CREATE TABLE mpa_abundance_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id TEXT NOT NULL UNIQUE REFERENCES mpas(external_id) ON DELETE CASCADE,
    species_count INTEGER NOT NULL DEFAULT 0,
    trend_direction TEXT CHECK (trend_direction IN ('increasing', 'stable', 'decreasing', 'insufficient_data')),
    health_score NUMERIC,
    total_records INTEGER NOT NULL DEFAULT 0,
    data_quality JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. environmental_summaries - Environmental data per MPA
-- =============================================================================
CREATE TABLE environmental_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id TEXT NOT NULL UNIQUE REFERENCES mpas(external_id) ON DELETE CASCADE,
    parameters JSONB NOT NULL DEFAULT '[]',
    habitat_quality_score NUMERIC,
    anomalies JSONB DEFAULT '[]',
    data_quality JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. pipeline_runs - Pipeline execution log
-- =============================================================================
CREATE TABLE pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    mpas_processed INTEGER NOT NULL DEFAULT 0,
    mpas_failed INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]'
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX idx_population_trends_mpa_id ON population_trends(mpa_id);
CREATE INDEX idx_population_trends_fetched_at ON population_trends(fetched_at);

CREATE INDEX idx_mpa_abundance_summaries_mpa_id ON mpa_abundance_summaries(mpa_id);
CREATE INDEX idx_mpa_abundance_summaries_fetched_at ON mpa_abundance_summaries(fetched_at);

CREATE INDEX idx_environmental_summaries_mpa_id ON environmental_summaries(mpa_id);
CREATE INDEX idx_environmental_summaries_fetched_at ON environmental_summaries(fetched_at);

CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_started_at ON pipeline_runs(started_at);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE population_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpa_abundance_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read on population_trends"
    ON population_trends FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on mpa_abundance_summaries"
    ON mpa_abundance_summaries FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on environmental_summaries"
    ON environmental_summaries FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on pipeline_runs"
    ON pipeline_runs FOR SELECT
    USING (true);

-- Service role write access
CREATE POLICY "Allow service_role insert on population_trends"
    ON population_trends FOR INSERT
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role update on population_trends"
    ON population_trends FOR UPDATE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role delete on population_trends"
    ON population_trends FOR DELETE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role insert on mpa_abundance_summaries"
    ON mpa_abundance_summaries FOR INSERT
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role update on mpa_abundance_summaries"
    ON mpa_abundance_summaries FOR UPDATE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role delete on mpa_abundance_summaries"
    ON mpa_abundance_summaries FOR DELETE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role insert on environmental_summaries"
    ON environmental_summaries FOR INSERT
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role update on environmental_summaries"
    ON environmental_summaries FOR UPDATE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role delete on environmental_summaries"
    ON environmental_summaries FOR DELETE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role insert on pipeline_runs"
    ON pipeline_runs FOR INSERT
    WITH CHECK (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role update on pipeline_runs"
    ON pipeline_runs FOR UPDATE
    USING (current_setting('role') = 'service_role');

CREATE POLICY "Allow service_role delete on pipeline_runs"
    ON pipeline_runs FOR DELETE
    USING (current_setting('role') = 'service_role');
