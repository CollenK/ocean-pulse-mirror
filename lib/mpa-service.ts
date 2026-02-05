import { MPA, MPAGeometry } from '@/types';
import { createBrowserClient } from '@supabase/ssr';

/**
 * MPA Service
 * Fetches Marine Protected Area data from Supabase (populated from WDPA)
 *
 * Data source: World Database on Protected Areas (WDPA)
 * https://www.protectedplanet.net/
 */

// Supabase client (lazy initialized)
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn('Supabase credentials not configured');
      return null;
    }

    supabaseClient = createBrowserClient(url, key);
  }
  return supabaseClient;
}

/**
 * Extract polygon coordinates from GeoJSON geometry
 * Returns coordinates in GeoJSON format [[lng, lat], ...]
 */
function extractPolygonFromGeometry(geometry: any): number[][][] | undefined {
  if (!geometry) return undefined;

  try {
    // Handle string (JSON that needs parsing)
    let geom = geometry;
    if (typeof geometry === 'string') {
      geom = JSON.parse(geometry);
    }

    if (!geom || !geom.type) return undefined;

    // Handle different geometry types
    if (geom.type === 'Polygon' && geom.coordinates) {
      return geom.coordinates;
    } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
      // For MultiPolygon, return the largest polygon (first one typically)
      return geom.coordinates[0];
    }

    return undefined;
  } catch (e) {
    console.warn('Error parsing geometry:', e);
    return undefined;
  }
}

/**
 * Calculate bounding box from polygon coordinates
 * Returns [[minLat, minLng], [maxLat, maxLng]]
 */
function boundsFromPolygon(polygon: number[][][]): number[][] {
  if (!polygon || !polygon[0] || polygon[0].length === 0) {
    return [];
  }

  // polygon[0] is the outer ring, coordinates are [lng, lat]
  const ring = polygon[0];
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const coord of ring) {
    const [lng, lat] = coord;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Return in [lat, lng] format for compatibility with existing bounds format
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

/**
 * Transform database row to MPA type
 */
function transformMPARow(row: any): MPA {
  // Parse center point from PostGIS format or stored coordinates
  let center: [number, number] = [0, 0];

  if (row.center) {
    // Handle different PostGIS return formats
    if (typeof row.center === 'string') {
      // Parse WKT: "POINT(lon lat)" or "SRID=4326;POINT(lon lat)"
      const match = row.center.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        center = [parseFloat(match[2]), parseFloat(match[1])]; // [lat, lon]
      }
    } else if (row.center.coordinates) {
      // GeoJSON format
      center = [row.center.coordinates[1], row.center.coordinates[0]];
    }
  }

  // Extract real polygon from PostGIS geometry (returned as GeoJSON via cast)
  const polygon = extractPolygonFromGeometry(row.geometry_geojson);

  // Calculate bounds from real polygon if available, otherwise approximate from center
  let bounds: number[][] = [];
  if (polygon) {
    bounds = boundsFromPolygon(polygon);
  }

  // Fallback to approximate bounds if no polygon or bounds extraction failed
  if (bounds.length === 0 && center[0] !== 0 && center[1] !== 0) {
    const [lat, lon] = center;
    const delta = 0.5; // ~50km approximate
    bounds = [
      [lat - delta, lon - delta],
      [lat + delta, lon + delta],
    ];
  }

  // Get health score (from joined health_scores or default)
  const healthScore = row.latest_health_score ?? row.health_score ?? 0;

  // Get species count (from joined species count or metadata)
  const speciesCount = row.species_count ?? row.metadata?.species_count ?? 0;

  // Build description from metadata if not set
  let description = row.description;
  if (!description && row.metadata) {
    const parts = [];
    if (row.metadata.designation) {
      parts.push(row.metadata.designation);
    }
    if (row.metadata.governance_type) {
      parts.push(`Governance: ${row.metadata.governance_type}`);
    }
    if (parts.length > 0) {
      description = parts.join('. ');
    }
  }

  return {
    id: row.external_id || row.id,
    dbId: row.id,
    name: row.name,
    country: row.country || 'Unknown',
    bounds,
    center,
    area: row.area_km2 || 0,
    healthScore,
    speciesCount,
    establishedYear: row.established_year || 0,
    protectionLevel: row.protection_level || 'Not Reported',
    description,
    regulations: row.metadata?.regulations,
    polygon,
  };
}

/**
 * Fetch the largest MPAs from Supabase
 * Returns the top 100 MPAs by area (km²) for performance
 */
export async function fetchAllMPAs(): Promise<MPA[]> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('Supabase not configured - cannot fetch MPAs');
    return [];
  }

  try {
    // Select columns without geometry first, then fetch geometry separately if needed
    // Large geometry data can cause query issues
    const { data, error } = await supabase
      .from('mpas')
      .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata')
      .gt('area_km2', 0)
      .order('area_km2', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching MPAs:', error);
      return [];
    }

    return (data || []).map(transformMPARow);
  } catch (error) {
    console.error('Error fetching MPAs:', error);
    return [];
  }
}

/**
 * Fetch a single MPA by ID
 */
export async function fetchMPAById(id: string): Promise<MPA | null> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('Supabase not configured');
    return null;
  }

  try {
    // Try to find by external_id first (WDPA ID), then by UUID
    let query = supabase
      .from('mpas')
      .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata')
      .eq('external_id', id)
      .single();

    let { data, error } = await query;

    // If not found by external_id, try by UUID id
    if (error || !data) {
      const { data: byUuid, error: uuidError } = await supabase
        .from('mpas')
        .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata')
        .eq('id', id)
        .single();

      if (uuidError || !byUuid) {
        return null;
      }
      data = byUuid;
    }

    return transformMPARow(data);
  } catch (error) {
    console.error('Error fetching MPA:', error);
    return null;
  }
}

/**
 * Find nearest MPAs to a given location
 * @param lat Latitude
 * @param lng Longitude
 * @param maxDistanceKm Maximum distance in kilometers
 */
export async function findNearestMPAs(
  lat: number,
  lng: number,
  maxDistanceKm: number = 500
): Promise<(MPA & { distance: number })[]> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('Supabase not configured');
    return [];
  }

  try {
    // Fetch all MPAs and calculate distance client-side
    // (For production, you'd use PostGIS ST_Distance)
    const { data, error } = await supabase
      .from('mpas')
      .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata');

    if (error) {
      console.error('Error fetching MPAs:', error);
      return [];
    }

    const mpas: MPA[] = (data || []).map(transformMPARow);

    // Calculate distance for each MPA
    const mpasWithDistance = mpas.map((mpa: MPA) => ({
      ...mpa,
      distance: calculateDistance(lat, lng, mpa.center[0], mpa.center[1]),
    }));

    // Filter by max distance and sort by distance
    return mpasWithDistance
      .filter((mpa) => mpa.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Error finding nearest MPAs:', error);
    return [];
  }
}

/**
 * Search MPAs by name
 */
export async function searchMPAs(query: string): Promise<MPA[]> {
  const supabase = getSupabase();

  if (!supabase || !query || query.length < 2) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('mpas')
      .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata')
      .ilike('name', `%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching MPAs:', error);
      return [];
    }

    return (data || []).map(transformMPARow);
  } catch (error) {
    console.error('Error searching MPAs:', error);
    return [];
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get health category based on score
 */
export function getHealthCategory(
  score: number
): 'healthy' | 'moderate' | 'at-risk' | 'unknown' {
  if (score === 0) return 'unknown';
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'moderate';
  return 'at-risk';
}

/**
 * Format area for display
 */
export function formatArea(areaKm2: number): string {
  if (!areaKm2 || areaKm2 === 0) return 'Unknown';
  if (areaKm2 >= 1000000) {
    return `${(areaKm2 / 1000000).toFixed(1)}M km²`;
  } else if (areaKm2 >= 1000) {
    return `${(areaKm2 / 1000).toFixed(1)}K km²`;
  }
  return `${areaKm2.toFixed(0)} km²`;
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm >= 1000) {
    return `${(distanceKm / 1000).toFixed(0)}K km`;
  } else if (distanceKm >= 10) {
    return `${distanceKm.toFixed(0)} km`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Fetch MPA geometries for map rendering
 * Returns a map of MPA external_id to GeoJSON geometry
 * @param externalIds - Optional array of external IDs to fetch geometries for
 */
export async function fetchMPAGeometries(externalIds?: string[]): Promise<Map<string, MPAGeometry>> {
  const supabase = getSupabase();
  const geometryMap = new Map<string, MPAGeometry>();

  if (!supabase) {
    console.error('Supabase not configured');
    return geometryMap;
  }

  try {
    const { data, error } = await supabase.rpc('get_mpa_geometries_for_map', {
      external_ids: externalIds || null,
    });

    if (error) {
      console.error('Error fetching MPA geometries:', error);
      return geometryMap;
    }

    console.log('GEOM DEBUG - Fetched', data?.length || 0, 'geometries');

    // Convert to map for easy lookup
    // Store as { type, coordinates } to preserve MultiPolygon structure
    for (const row of data || []) {
      if (row.geometry_geojson && row.external_id) {
        const geojson = row.geometry_geojson;

        if (geojson.type === 'Polygon' && geojson.coordinates) {
          // Store Polygon coordinates directly
          geometryMap.set(row.external_id, {
            type: 'Polygon',
            coordinates: geojson.coordinates,
          });
          console.log('GEOM DEBUG - Added Polygon for:', row.external_id);
        } else if (geojson.type === 'MultiPolygon' && geojson.coordinates) {
          // Keep full MultiPolygon structure
          geometryMap.set(row.external_id, {
            type: 'MultiPolygon',
            coordinates: geojson.coordinates,
          });
          console.log('GEOM DEBUG - Added MultiPolygon for:', row.external_id, 'with', geojson.coordinates.length, 'polygons');
        } else {
          console.log('GEOM DEBUG - Skipped:', row.external_id, 'type:', geojson?.type);
        }
      }
    }

    return geometryMap;
  } catch (error) {
    console.error('Error fetching MPA geometries:', error);
    return geometryMap;
  }
}

/**
 * Get MPA count from database
 */
export async function getMPACount(): Promise<number> {
  const supabase = getSupabase();

  if (!supabase) {
    return 0;
  }

  try {
    const { count, error } = await supabase
      .from('mpas')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting MPA count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting MPA count:', error);
    return 0;
  }
}
