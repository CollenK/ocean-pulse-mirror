import { MPA } from '@/types';
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

  // Parse bounds from geometry if available, otherwise create from center
  let bounds: number[][] = [];
  if (row.geometry) {
    // For now, create approximate bounds from center
    // In production, you'd extract actual polygon bounds
    const [lat, lon] = center;
    const delta = 0.5; // ~50km approximate
    bounds = [
      [lat - delta, lon - delta],
      [lat + delta, lon + delta],
    ];
  } else if (center[0] !== 0 && center[1] !== 0) {
    const [lat, lon] = center;
    const delta = 0.5;
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
  };
}

/**
 * Fetch all MPAs from Supabase
 */
export async function fetchAllMPAs(): Promise<MPA[]> {
  const supabase = getSupabase();

  if (!supabase) {
    console.error('Supabase not configured - cannot fetch MPAs');
    return [];
  }

  try {
    // Fetch MPAs with optional health score join
    const { data, error } = await supabase
      .from('mpas')
      .select(`
        *,
        health_scores (
          score
        )
      `)
      .order('name');

    if (error) {
      // If health_scores join fails (table doesn't exist), try without it
      if (error.message?.includes('health_scores')) {
        const { data: mpasOnly, error: mpasError } = await supabase
          .from('mpas')
          .select('*')
          .order('name');

        if (mpasError) {
          console.error('Error fetching MPAs:', mpasError);
          return [];
        }

        return (mpasOnly || []).map(transformMPARow);
      }

      console.error('Error fetching MPAs:', error);
      return [];
    }

    // Transform rows, using latest health score if available
    return (data || []).map((row: any) => {
      const healthScores = row.health_scores || [];
      const latestScore = healthScores.length > 0
        ? healthScores[healthScores.length - 1]?.score
        : null;

      return transformMPARow({
        ...row,
        latest_health_score: latestScore,
      });
    });
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
      .select('*')
      .eq('external_id', id)
      .single();

    let { data, error } = await query;

    // If not found by external_id, try by UUID id
    if (error || !data) {
      const { data: byUuid, error: uuidError } = await supabase
        .from('mpas')
        .select('*')
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
      .select('*');

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
      .select('*')
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
