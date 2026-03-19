/**
 * Global Fishing Watch API Client
 * https://globalfishingwatch.org/our-apis/documentation
 *
 * API Version: v3
 * License: Non-commercial use only
 *
 * This client handles all interactions with the GFW API including:
 * - 4Wings API for fishing effort heatmaps and reports
 * - Events API for vessel activity (encounters, loitering, fishing)
 * - Vessels API for vessel information
 * - Insights API for IUU risk assessment
 */

import type {
  GFW4WingsReportParams,
  GFW4WingsReportResponse,
  GFWEventsParams,
  GFWEventsResponse,
  GFWVessel,
  GFWVesselSearchParams,
  GFWVesselSearchResponse,
  GFWInsightsParams,
  GFWInsightsResponse,
  GFWFishingEffortSummary,
  GFWVesselActivity,
  GFWComplianceScore,
  GFWIUURiskAssessment,
  GFWRegion,
  GFWDateRange,
} from '@/types/gfw';

import {
  GFW_GEAR_TYPES,
  GFW_FLAG_NAMES,
  GFW_DATASETS,
} from '@/types/gfw';

// Re-export compliance functions so existing imports from gfw-client still work
export {
  calculateIUURiskFromFishingEffort,
  getIUURiskForMPA,
  calculateComplianceScore,
} from '@/lib/gfw-compliance';

const GFW_API_BASE = 'https://gateway.api.globalfishingwatch.org/v3';
const REQUEST_TIMEOUT = 60000; // 60 seconds (GFW can be slow)
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds base delay
const RATE_LIMIT_RETRY_DELAY = 5000; // 5 seconds for rate limit retries

/**
 * Get the GFW API token from environment variables
 */
function getApiToken(): string {
  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    throw new Error('GFW_API_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Make an authenticated request to the GFW API
 */
async function gfwFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = `${GFW_API_BASE}${endpoint}`;
  const token = getApiToken();

  // Debug logging
  console.log('[GFW API] Request:', {
    url,
    method: options.method || 'GET',
    body: options.body ? JSON.parse(options.body as string) : undefined,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[GFW API] Error ${response.status}:`, errorBody);

      // Handle rate limiting - use longer delays for 429 errors
      if (response.status === 429 && retries > 0) {
        const retryAfter = response.headers.get('Retry-After');
        // Use exponential backoff with longer base delay for rate limits
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : RATE_LIMIT_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
        console.log(`[GFW API] Rate limited, retrying in ${delay}ms (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return gfwFetch<T>(endpoint, options, retries - 1);
      }

      // Handle timeout errors (524)
      if (response.status === 524 && retries > 0) {
        console.log('[GFW API] Gateway timeout, retrying...');
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return gfwFetch<T>(endpoint, options, retries - 1);
      }

      throw new Error(`GFW API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      if (retries > 0) {
        console.log('[GFW API] Request timeout, retrying...');
        return gfwFetch<T>(endpoint, options, retries - 1);
      }
      throw new Error('GFW API request timed out', { cause: error });
    }

    throw error;
  }
}

// ============================================================================
// 4Wings API - Fishing Effort and Vessel Presence
// ============================================================================

/**
 * Raw response from GFW 4Wings API
 */
interface GFW4WingsRawResponse {
  total: number;
  limit: number | null;
  offset: number | null;
  nextOffset: number | null;
  metadata: Record<string, unknown>;
  entries: Array<Record<string, Array<{
    date?: string;
    hours: number;
    lat?: number;
    lon?: number;
    flag?: string;
    geartype?: string;
    vesselIDs?: number;
    'vessel-ids'?: string[];
  }>>>;
}

/**
 * Flatten nested GFW 4Wings response into a flat entry array.
 * GFW returns: { entries: [{ "dataset-name:version": [{date, hours, ...}] }] }
 */
function flattenRawEntries(
  rawEntries: GFW4WingsRawResponse['entries']
): GFW4WingsReportResponse['entries'] {
  const flat: GFW4WingsReportResponse['entries'] = [];
  for (const entryGroup of rawEntries) {
    for (const datasetKey of Object.keys(entryGroup)) {
      const datasetEntries = entryGroup[datasetKey];
      if (!Array.isArray(datasetEntries)) continue;
      for (const entry of datasetEntries) {
        flat.push({
          date: entry.date,
          hours: entry.hours || 0,
          lat: entry.lat,
          lon: entry.lon,
          flag: entry.flag,
          geartype: entry.geartype,
          vesselCount: entry.vesselIDs || (entry['vessel-ids']?.length || 0),
          vesselId: entry['vessel-ids']?.[0],
        });
      }
    }
  }
  return flat;
}

/**
 * Get fishing effort report for a geographic region
 * Uses the 4Wings API with correct parameter format
 */
export async function getFishingEffortReport(
  params: GFW4WingsReportParams
): Promise<GFW4WingsReportResponse> {
  // Build query parameters - GFW API uses bracket notation for arrays
  const queryParams = new URLSearchParams();

  // Datasets use indexed bracket notation: datasets[0], datasets[1], etc.
  if (params.datasets) {
    params.datasets.forEach((d, i) => queryParams.append(`datasets[${i}]`, d));
  }

  // Add date-range to query params
  if (params.dateRange) {
    queryParams.set('date-range', params.dateRange);
  }

  // Spatial and temporal resolution
  queryParams.set('spatial-resolution', params.spatialResolution || 'LOW');
  queryParams.set('temporal-resolution', params.temporalResolution || 'MONTHLY');

  // Group-by does NOT use bracket notation - just comma-separated or single value
  if (params.groupBy && params.groupBy.length > 0) {
    queryParams.set('group-by', params.groupBy.join(','));
  }

  // Format: JSON
  queryParams.set('format', 'JSON');

  // Build request body with geojson for custom geometries
  // The GFW API expects a GeoJSON Feature or FeatureCollection, not just the geometry
  const body: Record<string, unknown> = {
    geojson: {
      type: 'Feature',
      properties: {},
      geometry: params.region,
    },
  };

  console.log('[GFW] 4Wings request URL:', `/4wings/report?${queryParams.toString()}`);
  console.log('[GFW] 4Wings request body:', JSON.stringify(body, null, 2));

  const rawResponse = await gfwFetch<GFW4WingsRawResponse>(`/4wings/report?${queryParams.toString()}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const flatEntries = flattenRawEntries(rawResponse.entries);
  console.log('[GFW] Parsed entries:', flatEntries.length);

  return {
    entries: flatEntries,
    metadata: {
      datasets: params.datasets || [],
      dateRange: {
        start: params.dateRange?.split(',')[0] || '',
        end: params.dateRange?.split(',')[1] || '',
      },
      spatialAggregation: true,
      temporalAggregation: params.temporalResolution === 'ENTIRE',
    },
  };
}

/**
 * Accumulate hours/vesselCount into a Map, merging entries with the same key.
 */
function accumulateToMap(
  map: Map<string, { hours: number; vesselCount: number }>,
  key: string,
  hours: number,
  vesselCount: number
): void {
  const existing = map.get(key);
  if (existing) {
    existing.hours += hours;
    existing.vesselCount += vesselCount;
  } else {
    map.set(key, { hours, vesselCount });
  }
}

/**
 * Aggregate flat fishing effort entries into flag/gear breakdowns, hotspots, and totals.
 */
function aggregateFishingEntries(entries: GFW4WingsReportResponse['entries']) {
  let totalFishingHours = 0;
  const flagAgg = new Map<string, { hours: number; vesselCount: number }>();
  const gearAgg = new Map<string, { hours: number; vesselCount: number }>();
  const vesselIds = new Set<string>();

  for (const entry of entries) {
    totalFishingHours += entry.hours || 0;
    if (entry.vesselId) vesselIds.add(entry.vesselId);
    if (entry.flag) accumulateToMap(flagAgg, entry.flag, entry.hours, entry.vesselCount || 0);
    if (entry.geartype) accumulateToMap(gearAgg, entry.geartype, entry.hours, entry.vesselCount || 0);
  }

  const byFlag = Array.from(flagAgg.entries())
    .map(([flag, data]) => ({
      flag,
      flagName: GFW_FLAG_NAMES[flag] || flag,
      fishingHours: data.hours,
      vesselCount: data.vesselCount,
      percentage: totalFishingHours > 0 ? (data.hours / totalFishingHours) * 100 : 0,
    }))
    .sort((a, b) => b.fishingHours - a.fishingHours)
    .slice(0, 10);

  const byGearType = Array.from(gearAgg.entries())
    .map(([gearType, data]) => ({
      gearType,
      gearTypeName: GFW_GEAR_TYPES[gearType] || gearType,
      fishingHours: data.hours,
      vesselCount: data.vesselCount,
      percentage: totalFishingHours > 0 ? (data.hours / totalFishingHours) * 100 : 0,
    }))
    .sort((a, b) => b.fishingHours - a.fishingHours);

  const hotspots = entries
    .filter(e => e.lat !== undefined && e.lon !== undefined)
    .map(e => ({
      lat: e.lat!,
      lon: e.lon!,
      fishingHours: e.hours,
      intensity: getIntensityLevel(e.hours, totalFishingHours),
    }))
    .filter(h => h.intensity !== 'low')
    .slice(0, 20);

  const totalVessels = vesselIds.size > 0
    ? vesselIds.size
    : Math.max(...Array.from(flagAgg.values()).map(v => v.vesselCount), 0);

  return { totalFishingHours, totalVessels, byFlag, byGearType, hotspots };
}

/**
 * Get fishing effort summary for an MPA
 *
 * OPTIMIZED: Uses single API call with FLAGANDGEARTYPE grouping
 * This reduces load time from ~75 seconds (3 calls) to ~15 seconds (1 call)
 */
export async function getFishingEffortForMPA(
  mpaId: string,
  geometry: GFWRegion,
  dateRange?: GFWDateRange
): Promise<GFWFishingEffortSummary> {
  // Default to last 12 months if no date range provided
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const range = dateRange || {
    start: oneYearAgo.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  };

  const dateRangeStr = `${range.start},${range.end}`;

  // OPTIMIZED: Single API call with combined flag+gear grouping
  // This returns both flag and geartype in each entry, which we aggregate locally
  console.log('[GFW] Fetching fishing effort (optimized single call)...');
  const response = await getFishingEffortReport({
    datasets: [GFW_DATASETS.FISHING_EFFORT],
    dateRange: dateRangeStr,
    spatialResolution: 'LOW',
    temporalResolution: 'ENTIRE',
    groupBy: ['FLAGANDGEARTYPE'],
    region: geometry,
  });

  console.log('[GFW] Processing', response.entries.length, 'entries...');

  const aggregated = aggregateFishingEntries(response.entries);

  return {
    mpaId,
    dateRange: range,
    ...aggregated,
    monthlyTrend: [], // Deferred - can lazy-load if needed
    lastUpdated: Date.now(),
  };
}

function getIntensityLevel(hours: number, total: number): 'low' | 'medium' | 'high' | 'very_high' {
  const percentage = total > 0 ? (hours / total) * 100 : 0;
  if (percentage >= 20) return 'very_high';
  if (percentage >= 10) return 'high';
  if (percentage >= 5) return 'medium';
  return 'low';
}

// ============================================================================
// Events API - Vessel Activity
// ============================================================================

/**
 * Get vessel events for specific vessels
 * Note: GFW Events API requires vessel IDs - it does not support region-based queries
 */
export async function getVesselEvents(
  params: GFWEventsParams
): Promise<GFWEventsResponse> {
  // The Events API requires vessel IDs
  if (!params.vesselIds || params.vesselIds.length === 0) {
    throw new Error('GFW Events API requires vessel IDs. Region-based event queries are not supported.');
  }

  // Build query params with bracket notation
  const queryParams = new URLSearchParams();

  // Vessels use indexed bracket notation
  params.vesselIds.forEach((v, i) => queryParams.append(`vessels[${i}]`, v));

  // Datasets use indexed bracket notation
  if (params.datasets && params.datasets.length > 0) {
    params.datasets.forEach((d, i) => queryParams.append(`datasets[${i}]`, d));
  }

  // Date range
  if (params.startDate) queryParams.set('start-date', params.startDate);
  if (params.endDate) queryParams.set('end-date', params.endDate);

  // Pagination
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());

  return gfwFetch<GFWEventsResponse>(`/events?${queryParams.toString()}`);
}

/**
 * Get recent vessel activity for an MPA
 * Note: The GFW Events API requires specific vessel IDs and does not support
 * region-based queries. This function returns an empty array.
 * To get vessel events, you would need to first identify vessels in the area
 * using the 4Wings API, then query their events individually.
 */
export async function getVesselActivityForMPA(
  _mpaId: string,
  _geometry: GFWRegion,
  _days: number = 30
): Promise<GFWVesselActivity[]> {
  // The GFW Events API does not support region-based queries.
  // It requires specific vessel IDs which we don't have without
  // first doing a vessel search in the area.
  console.log('[GFW] Vessel activity by region is not supported by Events API');
  return [];
}

// ============================================================================
// Vessels API
// ============================================================================

/**
 * Search for vessels by name, MMSI, or IMO
 */
export async function searchVessels(
  params: GFWVesselSearchParams
): Promise<GFWVesselSearchResponse> {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.set('query', params.query);
  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.offset) queryParams.set('offset', params.offset.toString());
  if (params.datasets) {
    params.datasets.forEach(d => queryParams.append('datasets', d));
  }

  return gfwFetch<GFWVesselSearchResponse>(`/vessels/search?${queryParams.toString()}`);
}

/**
 * Get vessel details by ID
 */
export async function getVesselById(vesselId: string): Promise<GFWVessel | null> {
  try {
    return await gfwFetch<GFWVessel>(`/vessels/${vesselId}`);
  } catch (error) {
    console.error(`[GFW] Error fetching vessel ${vesselId}:`, error);
    return null;
  }
}

// ============================================================================
// Insights API - IUU Risk Assessment
// ============================================================================

/**
 * Get vessel insights for IUU risk assessment
 */
export async function getVesselInsights(
  params: GFWInsightsParams
): Promise<GFWInsightsResponse> {
  return gfwFetch<GFWInsightsResponse>('/insights', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// IUU risk and compliance functions are in lib/gfw-compliance.ts

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert MPA bounds to GFW region format
 * MPA bounds format: [[lat, lng], [lat, lng], ...] - can be corners or polygon points
 * GeoJSON format: coordinates in [longitude, latitude] order
 */
export function boundsToGFWRegion(bounds: number[][]): GFWRegion {
  if (bounds.length === 2) {
    // Bounding box format: [[minLat, minLng], [maxLat, maxLng]]
    const minLat = bounds[0][0];
    const minLng = bounds[0][1];
    const maxLat = bounds[1][0];
    const maxLng = bounds[1][1];

    // Convert to GeoJSON polygon with [lng, lat] order
    return {
      type: 'Polygon',
      coordinates: [[
        [minLng, minLat], // SW
        [maxLng, minLat], // SE
        [maxLng, maxLat], // NE
        [minLng, maxLat], // NW
        [minLng, minLat], // Close polygon (SW again)
      ]],
    };
  }

  // Polygon points format: [[lat, lng], [lat, lng], ...]
  // Convert to GeoJSON polygon with [lng, lat] order
  const coordinates = bounds.map(([lat, lng]) => [lng, lat]);
  // Ensure polygon is closed
  if (coordinates.length > 0 &&
      (coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
       coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
    coordinates.push([...coordinates[0]]);
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Convert GeoJSON geometry to GFW region format
 */
export function geometryToGFWRegion(geometry: { type: string; coordinates: number[][][] | number[][][][] }): GFWRegion {
  return {
    type: geometry.type as 'Polygon' | 'MultiPolygon',
    coordinates: geometry.coordinates,
  };
}

/**
 * Format fishing hours for display
 */
export function formatFishingHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  if (hours < 168) return `${(hours / 24).toFixed(1)} days`;
  return `${(hours / 168).toFixed(1)} weeks`;
}

/**
 * Get flag emoji for a country code
 */
export function getFlagEmoji(countryCode: string): string {
  // Convert country code to flag emoji using regional indicator symbols
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Re-export types
export type { GFWVessel, GFWFishingEffortSummary, GFWVesselActivity, GFWComplianceScore, GFWIUURiskAssessment };
