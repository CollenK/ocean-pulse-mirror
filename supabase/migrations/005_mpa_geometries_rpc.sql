-- Migration: RPC function to fetch MPA geometries as GeoJSON for map rendering
-- This returns geometry data efficiently for the frontend map

-- ============================================
-- RPC Function: get_mpa_geometries_for_map
-- ============================================
-- Returns MPA geometries as GeoJSON for map rendering.
-- Accepts an optional array of external_ids to filter by.

DROP FUNCTION IF EXISTS get_mpa_geometries_for_map(INT);

CREATE OR REPLACE FUNCTION get_mpa_geometries_for_map(external_ids TEXT[] DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  geometry_geojson JSONB
) AS $$
BEGIN
  IF external_ids IS NULL THEN
    -- Return all MPAs with geometry
    RETURN QUERY
    SELECT
      m.id,
      m.external_id::TEXT,
      ST_AsGeoJSON(m.geometry)::jsonb as geometry_geojson
    FROM mpas m
    WHERE m.geometry IS NOT NULL;
  ELSE
    -- Return only specified MPAs with geometry
    RETURN QUERY
    SELECT
      m.id,
      m.external_id::TEXT,
      ST_AsGeoJSON(m.geometry)::jsonb as geometry_geojson
    FROM mpas m
    WHERE m.geometry IS NOT NULL
      AND m.external_id = ANY(external_ids);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_mpa_geometries_for_map(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mpa_geometries_for_map(TEXT[]) TO anon;

COMMENT ON FUNCTION get_mpa_geometries_for_map(TEXT[]) IS
  'Returns MPA geometries as GeoJSON for map rendering. Can filter by external_ids array.';
