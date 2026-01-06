-- Ocean PULSE Database Schema
-- Run this in your Supabase SQL Editor

-- Enable PostGIS extension for geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- MPAs Table (populated from MPAtlas)
-- ============================================
CREATE TABLE IF NOT EXISTS mpas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,  -- MPAtlas ID
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    region VARCHAR(100),
    geometry GEOMETRY(GEOMETRY, 4326),
    center GEOMETRY(POINT, 4326),
    area_km2 DECIMAL(12, 2),
    established_year INT,
    protection_level VARCHAR(50),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mpas_geometry ON mpas USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_mpas_center ON mpas USING GIST(center);
CREATE INDEX IF NOT EXISTS idx_mpas_country ON mpas(country);
CREATE INDEX IF NOT EXISTS idx_mpas_name ON mpas(name);

-- ============================================
-- Environmental Data Cache (from Copernicus)
-- ============================================
CREATE TABLE IF NOT EXISTS environmental_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    parameter VARCHAR(50) NOT NULL,  -- 'sst', 'chlorophyll', 'oxygen', 'ph'
    value DECIMAL(10, 4),
    unit VARCHAR(20),
    min_value DECIMAL(10, 4),
    max_value DECIMAL(10, 4),
    depth_m DECIMAL(8, 2),
    measured_at TIMESTAMPTZ,
    source VARCHAR(50) DEFAULT 'copernicus',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, parameter, measured_at)
);

CREATE INDEX IF NOT EXISTS idx_env_mpa ON environmental_data(mpa_id);
CREATE INDEX IF NOT EXISTS idx_env_param ON environmental_data(parameter);
CREATE INDEX IF NOT EXISTS idx_env_created ON environmental_data(created_at DESC);

-- ============================================
-- Species Data Cache (from OBIS)
-- ============================================
CREATE TABLE IF NOT EXISTS species_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    scientific_name VARCHAR(255) NOT NULL,
    common_name VARCHAR(255),
    aphia_id INT,
    observation_count INT,
    trend VARCHAR(20),  -- 'increasing', 'stable', 'decreasing', 'unknown'
    trend_percentage DECIMAL(5, 2),
    last_observed DATE,
    source VARCHAR(50) DEFAULT 'obis',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, scientific_name)
);

CREATE INDEX IF NOT EXISTS idx_species_mpa ON species_data(mpa_id);
CREATE INDEX IF NOT EXISTS idx_species_name ON species_data(scientific_name);

-- ============================================
-- Health Scores (calculated)
-- ============================================
CREATE TABLE IF NOT EXISTS health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    score INT CHECK (score >= 0 AND score <= 100),
    confidence VARCHAR(20),  -- 'high', 'medium', 'low'
    breakdown JSONB,  -- { biodiversity: 75, population: 80, thermal: 70, productivity: 85 }
    data_sources JSONB,  -- ['copernicus', 'obis', 'mpatlas']
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(mpa_id, calculated_at)
);

CREATE INDEX IF NOT EXISTS idx_health_mpa ON health_scores(mpa_id);
CREATE INDEX IF NOT EXISTS idx_health_calculated ON health_scores(calculated_at DESC);

-- ============================================
-- User Profiles (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- User Saved MPAs
-- ============================================
CREATE TABLE IF NOT EXISTS saved_mpas (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    mpa_id UUID REFERENCES mpas(id) ON DELETE CASCADE,
    notes TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (user_id, mpa_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_mpas(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_mpa ON saved_mpas(mpa_id);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE mpas ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_mpas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migrations)
DROP POLICY IF EXISTS "MPAs are viewable by everyone" ON mpas;
DROP POLICY IF EXISTS "Environmental data is viewable by everyone" ON environmental_data;
DROP POLICY IF EXISTS "Species data is viewable by everyone" ON species_data;
DROP POLICY IF EXISTS "Health scores are viewable by everyone" ON health_scores;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own saved MPAs" ON saved_mpas;
DROP POLICY IF EXISTS "Users can save MPAs" ON saved_mpas;
DROP POLICY IF EXISTS "Users can delete their own saved MPAs" ON saved_mpas;

-- Public read access for data tables (anyone can view MPA data)
CREATE POLICY "MPAs are viewable by everyone"
    ON mpas FOR SELECT USING (true);

CREATE POLICY "Environmental data is viewable by everyone"
    ON environmental_data FOR SELECT USING (true);

CREATE POLICY "Species data is viewable by everyone"
    ON species_data FOR SELECT USING (true);

CREATE POLICY "Health scores are viewable by everyone"
    ON health_scores FOR SELECT USING (true);

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- Saved MPAs: users can only access their own
CREATE POLICY "Users can view their own saved MPAs"
    ON saved_mpas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save MPAs"
    ON saved_mpas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved MPAs"
    ON saved_mpas FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for mpas updated_at
DROP TRIGGER IF EXISTS update_mpas_updated_at ON mpas;
CREATE TRIGGER update_mpas_updated_at
    BEFORE UPDATE ON mpas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Service Role Policies (for backend access)
-- ============================================

-- Drop existing service role policies if they exist
DROP POLICY IF EXISTS "Service role can insert MPAs" ON mpas;
DROP POLICY IF EXISTS "Service role can update MPAs" ON mpas;
DROP POLICY IF EXISTS "Service role can insert environmental data" ON environmental_data;
DROP POLICY IF EXISTS "Service role can update environmental data" ON environmental_data;
DROP POLICY IF EXISTS "Service role can insert species data" ON species_data;
DROP POLICY IF EXISTS "Service role can update species data" ON species_data;
DROP POLICY IF EXISTS "Service role can insert health scores" ON health_scores;
DROP POLICY IF EXISTS "Service role can update health scores" ON health_scores;

-- Allow service role to insert/update data tables
CREATE POLICY "Service role can insert MPAs"
    ON mpas FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update MPAs"
    ON mpas FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can insert environmental data"
    ON environmental_data FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update environmental data"
    ON environmental_data FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can insert species data"
    ON species_data FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update species data"
    ON species_data FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can insert health scores"
    ON health_scores FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update health scores"
    ON health_scores FOR UPDATE TO service_role USING (true);
