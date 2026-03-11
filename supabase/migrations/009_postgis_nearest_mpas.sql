-- Create function to find nearest MPAs using PostGIS
-- Replaces client-side Haversine calculation with server-side spatial query

CREATE OR REPLACE FUNCTION find_nearest_mpas(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_max_distance_km DOUBLE PRECISION DEFAULT 500,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  name TEXT,
  country TEXT,
  center JSONB,
  area_km2 DOUBLE PRECISION,
  established_year INT,
  protection_level TEXT,
  description TEXT,
  metadata JSONB,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.external_id,
    m.name,
    m.country,
    m.center,
    m.area_km2,
    m.established_year,
    m.protection_level,
    m.description,
    m.metadata,
    ROUND(
      (ST_Distance(
        m.center::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric,
      2
    )::double precision AS distance_km
  FROM mpas m
  WHERE ST_DWithin(
    m.center::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_max_distance_km * 1000  -- Convert km to meters
  )
  ORDER BY distance_km
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated and anon users (read-only data)
GRANT EXECUTE ON FUNCTION find_nearest_mpas TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearest_mpas TO anon;
