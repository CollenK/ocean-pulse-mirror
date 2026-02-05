-- Migration: Add RPC function for updating MPA geometry from Protected Planet
-- This function allows the data service to update PostGIS geometry columns
-- for MPA polygon boundaries fetched from the Protected Planet API.

-- ============================================
-- RPC Function: update_mpa_geometry
-- ============================================
-- Accepts a MPA UUID and WKT geometry string, converts to PostGIS geometry,
-- and updates the mpas table.

CREATE OR REPLACE FUNCTION update_mpa_geometry(mpa_uuid UUID, geom_wkt TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE mpas
  SET
    geometry = ST_GeomFromText(geom_wkt, 4326),
    updated_at = now()
  WHERE id = mpa_uuid;

  -- Raise notice if no rows updated (for debugging)
  IF NOT FOUND THEN
    RAISE NOTICE 'No MPA found with id: %', mpa_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_mpa_geometry(UUID, TEXT) TO service_role;

-- ============================================
-- RPC Function: get_mpa_geometry_as_geojson
-- ============================================
-- Helper function to get MPA geometry as GeoJSON for the frontend.
-- This is more efficient than casting in every query.

CREATE OR REPLACE FUNCTION get_mpa_geometry_as_geojson(mpa_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT ST_AsGeoJSON(geometry)::jsonb INTO result
  FROM mpas
  WHERE id = mpa_uuid AND geometry IS NOT NULL;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_mpa_geometry_as_geojson(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mpa_geometry_as_geojson(UUID) TO anon;

-- ============================================
-- RPC Function: check_mpa_has_geometry
-- ============================================
-- Quick check if an MPA has real polygon geometry (not null).

CREATE OR REPLACE FUNCTION check_mpa_has_geometry(mpa_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_geom BOOLEAN;
BEGIN
  SELECT geometry IS NOT NULL INTO has_geom
  FROM mpas
  WHERE id = mpa_uuid;

  RETURN COALESCE(has_geom, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_mpa_has_geometry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_mpa_has_geometry(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_mpa_has_geometry(UUID) TO service_role;

-- ============================================
-- Comment documentation
-- ============================================
COMMENT ON FUNCTION update_mpa_geometry(UUID, TEXT) IS
  'Updates MPA geometry from WKT string. Used by data service to store Protected Planet polygon boundaries.';

COMMENT ON FUNCTION get_mpa_geometry_as_geojson(UUID) IS
  'Returns MPA geometry as GeoJSON. Efficient helper for frontend map rendering.';

COMMENT ON FUNCTION check_mpa_has_geometry(UUID) IS
  'Quick check if MPA has real polygon geometry (not null).';
