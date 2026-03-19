import { MPA, MPAGeometry } from '@/types';
import { captureError } from '@/lib/error-reporting';
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
function extractPolygonFromGeometry(geometry: unknown): number[][][] | undefined {
  if (!geometry) return undefined;

  try {
    // Handle string (JSON that needs parsing)
    let geom: Record<string, unknown> | null = null;
    if (typeof geometry === 'string') {
      geom = JSON.parse(geometry);
    } else if (typeof geometry === 'object' && geometry !== null) {
      geom = geometry as Record<string, unknown>;
    }

    if (!geom || !geom.type) return undefined;

    // Handle different geometry types
    if (geom.type === 'Polygon' && geom.coordinates) {
      return geom.coordinates as number[][][];
    } else if (geom.type === 'MultiPolygon' && geom.coordinates) {
      // For MultiPolygon, return the largest polygon (first one typically)
      return (geom.coordinates as number[][][][])[0];
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
 * Parse center point from PostGIS format or stored coordinates.
 * Returns [lat, lon] tuple.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCenterPoint(row: Record<string, any>): [number, number] {
  if (!row.center) return [0, 0];

  if (typeof row.center === 'string') {
    const match = row.center.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) return [parseFloat(match[2]), parseFloat(match[1])];
  } else if (row.center.coordinates) {
    return [row.center.coordinates[1], row.center.coordinates[0]];
  }

  return [0, 0];
}

/**
 * Extract health score and species count from a database row.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractHealthMetrics(row: Record<string, any>): { healthScore: number; speciesCount: number } {
  const abundanceSummary = row.mpa_abundance_summaries?.[0] || row.mpa_abundance_summaries || null;
  return {
    healthScore: abundanceSummary?.health_score ?? row.health_score ?? 0,
    speciesCount: abundanceSummary?.species_count ?? row.metadata?.species_count ?? 0,
  };
}

/**
 * Build a description string from row metadata when no explicit description is set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDescription(row: Record<string, any>): string | undefined {
  if (row.description) return row.description;
  if (!row.metadata) return undefined;

  const parts: string[] = [];
  if (row.metadata.designation) parts.push(row.metadata.designation);
  if (row.metadata.governance_type) parts.push(`Governance: ${row.metadata.governance_type}`);
  return parts.length > 0 ? parts.join('. ') : undefined;
}

/**
 * Compute bounds from polygon or approximate from center.
 */
function computeBounds(polygon: number[][][] | undefined, center: [number, number]): number[][] {
  if (polygon) {
    const bounds = boundsFromPolygon(polygon);
    if (bounds.length > 0) return bounds;
  }

  if (center[0] !== 0 && center[1] !== 0) {
    const [lat, lon] = center;
    const delta = 0.5; // ~50km approximate
    return [
      [lat - delta, lon - delta],
      [lat + delta, lon + delta],
    ];
  }

  return [];
}

/**
 * Transform database row to MPA type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformMPARow(row: Record<string, any>): MPA {
  const center = parseCenterPoint(row);
  const polygon = extractPolygonFromGeometry(row.geometry_geojson);
  const bounds = computeBounds(polygon, center);
  const { healthScore, speciesCount } = extractHealthMetrics(row);

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
    description: buildDescription(row),
    regulations: row.metadata?.regulations,
    polygon,
  };
}

// European coastal/maritime countries (ISO 3166-1 alpha-3 codes matching WDPA data)
// Used to ensure European MPAs are loaded for wind farm conflict detection
const EUROPEAN_COUNTRY_CODES = [
  'ALB', 'BEL', 'BGR', 'CYP', 'DEU', 'DNK', 'ESP', 'EST', 'FIN', 'FRA',
  'GBR', 'GRC', 'HRV', 'IRL', 'ISL', 'ITA', 'LTU', 'LVA', 'MLT', 'MNE',
  'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'SVN', 'SWE', 'TUR',
];

const MPA_SELECT_COLUMNS = 'id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata';

/**
 * Fetch pipeline health scores and merge them into the MPA array.
 * Gracefully handles missing tables.
 */
async function mergeHealthScores(
  supabase: ReturnType<typeof createBrowserClient>,
  mpas: MPA[]
): Promise<void> {
  try {
    const { data: healthData } = await supabase
      .from('mpa_abundance_summaries')
      .select('mpa_id, health_score, species_count');

    if (!healthData || healthData.length === 0) return;

    type HealthRow = { mpa_id: string; health_score: number | null; species_count: number | null };
    const healthMap = new Map<string, HealthRow>(
      (healthData as HealthRow[]).map((h) => [h.mpa_id, h])
    );
    for (const mpa of mpas) {
      const h = healthMap.get(mpa.id);
      if (h) {
        mpa.healthScore = h.health_score ?? mpa.healthScore;
        mpa.speciesCount = h.species_count ?? mpa.speciesCount;
      }
    }
  } catch {
    // Pipeline tables may not exist yet; continue with default scores
  }
}

/**
 * Fetch MPAs from Supabase
 * Returns the top 100 largest MPAs globally plus all European MPAs
 * (European MPAs are needed for wind farm conflict detection)
 */
export async function fetchAllMPAs(): Promise<MPA[]> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('Supabase not configured - cannot fetch MPAs');
    return [];
  }

  try {
    // Build an OR filter that matches exact country codes and multi-country entries
    // WDPA uses semicolons for shared MPAs, e.g. "DEU;DNK;NLD"
    const countryFilter = EUROPEAN_COUNTRY_CODES
      .map((code) => `country.eq.${code},country.like.*${code}*`)
      .join(',');

    // Fetch top 100 largest MPAs globally and all European MPAs in parallel
    const [globalResult, europeanResult] = await Promise.all([
      supabase
        .from('mpas')
        .select(MPA_SELECT_COLUMNS)
        .gt('area_km2', 0)
        .order('area_km2', { ascending: false })
        .limit(100),
      supabase
        .from('mpas')
        .select(MPA_SELECT_COLUMNS)
        .or(countryFilter)
        .gt('area_km2', 0)
        .order('area_km2', { ascending: false })
        .limit(1000),
    ]);

    if (globalResult.error) {
      console.error('Error fetching global MPAs:', globalResult.error);
    }
    if (europeanResult.error) {
      console.error('Error fetching European MPAs:', europeanResult.error);
    }

    // Merge and deduplicate by id
    const seen = new Set<string>();
    const merged: MPA[] = [];

    for (const row of [...(globalResult.data || []), ...(europeanResult.data || [])]) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        merged.push(transformMPARow(row));
      }
    }

    await mergeHealthScores(supabase, merged);

    return merged;
  } catch (error) {
    captureError(error, { context: 'fetchAllMPAs' });
    throw error;
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
    const { data, error } = await supabase
      .from('mpas')
      .select('id, external_id, name, country, center, area_km2, established_year, protection_level, description, metadata')
      .eq('external_id', id)
      .single();

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
      return transformMPARow(byUuid);
    }

    return transformMPARow(data);
  } catch (error) {
    captureError(error, { context: 'fetchMPAById', id });
    throw error;
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
    const { data, error } = await supabase.rpc('find_nearest_mpas', {
      p_lat: lat,
      p_lng: lng,
      p_max_distance_km: maxDistanceKm,
      p_limit: 20,
    });

    if (error) {
      captureError(error, { context: 'findNearestMPAs', lat: String(lat), lng: String(lng) });
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: Record<string, any>) => ({
      ...transformMPARow(row),
      distance: row.distance_km,
    }));
  } catch (error) {
    captureError(error, { context: 'findNearestMPAs', lat: String(lat), lng: String(lng) });
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
    captureError(error, { context: 'searchMPAs', query });
    throw error;
  }
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
 * Parse a single geometry row into an MPAGeometry, or return null if invalid.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGeometryRow(row: Record<string, any>): MPAGeometry | null {
  if (!row.geometry_geojson || !row.external_id) return null;

  const geojson = row.geometry_geojson;
  if (geojson.type === 'Polygon' && geojson.coordinates) {
    console.log('GEOM DEBUG - Added Polygon for:', row.external_id);
    return { type: 'Polygon', coordinates: geojson.coordinates };
  }
  if (geojson.type === 'MultiPolygon' && geojson.coordinates) {
    console.log('GEOM DEBUG - Added MultiPolygon for:', row.external_id, 'with', geojson.coordinates.length, 'polygons');
    return { type: 'MultiPolygon', coordinates: geojson.coordinates };
  }
  console.log('GEOM DEBUG - Skipped:', row.external_id, 'type:', geojson?.type);
  return null;
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

    for (const row of data || []) {
      const geometry = parseGeometryRow(row);
      if (geometry) {
        geometryMap.set(row.external_id, geometry);
      }
    }

    return geometryMap;
  } catch (error) {
    captureError(error, { context: 'fetchMPAGeometries' });
    throw error;
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
