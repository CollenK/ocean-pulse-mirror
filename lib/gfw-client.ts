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
  GFWEvent,
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
      throw new Error('GFW API request timed out');
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

  // Transform the nested response format to our flat entry format
  // GFW returns: { entries: [{ "dataset-name:version": [{date, hours, lat, lon, ...}] }] }
  const flatEntries: GFW4WingsReportResponse['entries'] = [];

  for (const entryGroup of rawResponse.entries) {
    // Each entryGroup has dataset names as keys
    for (const datasetKey of Object.keys(entryGroup)) {
      const datasetEntries = entryGroup[datasetKey];
      if (Array.isArray(datasetEntries)) {
        for (const entry of datasetEntries) {
          flatEntries.push({
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
  }

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

  // Calculate totals and aggregate by flag and gear type from combined response
  let totalFishingHours = 0;
  const flagAggregation = new Map<string, { hours: number; vesselCount: number }>();
  const gearAggregation = new Map<string, { hours: number; vesselCount: number }>();
  const vesselIds = new Set<string>();

  for (const entry of response.entries) {
    totalFishingHours += entry.hours || 0;

    if (entry.vesselId) {
      vesselIds.add(entry.vesselId);
    }

    // Aggregate by flag
    if (entry.flag) {
      const existing = flagAggregation.get(entry.flag);
      if (existing) {
        existing.hours += entry.hours;
        existing.vesselCount += entry.vesselCount || 0;
      } else {
        flagAggregation.set(entry.flag, {
          hours: entry.hours,
          vesselCount: entry.vesselCount || 0,
        });
      }
    }

    // Aggregate by gear type
    if (entry.geartype) {
      const existing = gearAggregation.get(entry.geartype);
      if (existing) {
        existing.hours += entry.hours;
        existing.vesselCount += entry.vesselCount || 0;
      } else {
        gearAggregation.set(entry.geartype, {
          hours: entry.hours,
          vesselCount: entry.vesselCount || 0,
        });
      }
    }
  }

  // Build flag breakdown (top 10)
  const byFlag = Array.from(flagAggregation.entries())
    .map(([flag, data]) => ({
      flag,
      flagName: GFW_FLAG_NAMES[flag] || flag,
      fishingHours: data.hours,
      vesselCount: data.vesselCount,
      percentage: totalFishingHours > 0 ? (data.hours / totalFishingHours) * 100 : 0,
    }))
    .sort((a, b) => b.fishingHours - a.fishingHours)
    .slice(0, 10);

  // Build gear type breakdown
  const byGearType = Array.from(gearAggregation.entries())
    .map(([gearType, data]) => ({
      gearType,
      gearTypeName: GFW_GEAR_TYPES[gearType] || gearType,
      fishingHours: data.hours,
      vesselCount: data.vesselCount,
      percentage: totalFishingHours > 0 ? (data.hours / totalFishingHours) * 100 : 0,
    }))
    .sort((a, b) => b.fishingHours - a.fishingHours);

  // Identify hotspots from spatial data (if available)
  const hotspots = response.entries
    .filter(e => e.lat !== undefined && e.lon !== undefined)
    .map(e => ({
      lat: e.lat!,
      lon: e.lon!,
      fishingHours: e.hours,
      intensity: getIntensityLevel(e.hours, totalFishingHours),
    }))
    .filter(h => h.intensity !== 'low')
    .slice(0, 20);

  // Estimate vessel count if not available from vesselIds
  const totalVessels = vesselIds.size > 0
    ? vesselIds.size
    : Math.max(...Array.from(flagAggregation.values()).map(v => v.vesselCount), 0);

  return {
    mpaId,
    dateRange: range,
    totalFishingHours,
    totalVessels,
    byFlag,
    byGearType,
    monthlyTrend: [], // Deferred - can lazy-load if needed
    hotspots,
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

function formatVesselEvent(event: GFWEvent, mpaId: string): GFWVesselActivity {
  const duration = event.end && event.start
    ? (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60)
    : undefined;

  let description = '';
  let severity: 'info' | 'warning' | 'alert' = 'info';

  switch (event.type) {
    case 'fishing':
      description = `Fishing activity detected${duration ? ` (${duration.toFixed(1)} hours)` : ''}`;
      severity = 'warning';
      break;
    case 'encounter':
      description = event.encounter?.vessel
        ? `Encounter with ${event.encounter.vessel.name || 'unknown vessel'}`
        : 'Vessel encounter detected';
      severity = 'alert';
      break;
    case 'loitering':
      description = `Loitering behavior${duration ? ` (${duration.toFixed(1)} hours)` : ''}`;
      severity = 'warning';
      break;
    case 'port_visit':
      description = event.portVisit?.startAnchorage?.name
        ? `Port visit at ${event.portVisit.startAnchorage.name}`
        : 'Port visit detected';
      severity = 'info';
      break;
    default:
      description = `${event.type} event detected`;
  }

  return {
    id: event.id,
    type: event.type,
    timestamp: event.start,
    duration,
    location: [event.position.lat, event.position.lon],
    vessel: {
      id: event.vessel.id,
      name: event.vessel.name || 'Unknown Vessel',
      flag: event.vessel.flag || 'UNK',
      flagName: GFW_FLAG_NAMES[event.vessel.flag || ''] || event.vessel.flag || 'Unknown',
      mmsi: event.vessel.ssvid,
      gearType: event.vessel.type,
    },
    description,
    severity,
    relatedMPA: mpaId,
  };
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

/**
 * Calculate IUU risk assessment from pre-fetched fishing effort data
 * This avoids making additional API calls when we already have the data.
 */
export function calculateIUURiskFromFishingEffort(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment {
  const totalHours = fishingEffort.totalFishingHours;
  const vesselCount = fishingEffort.totalVessels;

  // Risk factors based on fishing patterns
  const factors: GFWIUURiskAssessment['factors'] = [];

  // High fishing hours in MPA could indicate compliance issues
  if (totalHours > 1000) {
    factors.push({
      type: 'high_fishing_activity',
      description: 'High fishing activity detected in MPA',
      count: Math.round(totalHours),
      severity: totalHours > 5000 ? 'high' : 'medium',
    });
  }

  // Multiple flag states could indicate transshipment risk
  if (fishingEffort.byFlag.length > 5) {
    factors.push({
      type: 'multiple_flags',
      description: 'Vessels from multiple flag states',
      count: fishingEffort.byFlag.length,
      severity: fishingEffort.byFlag.length > 10 ? 'high' : 'medium',
    });
  }

  // Calculate risk score (0-100)
  let riskScore = 0;
  if (totalHours > 0) {
    // Base score on fishing intensity
    riskScore = Math.min(50, totalHours / 100);
    // Add points for multiple flags
    riskScore += Math.min(30, fishingEffort.byFlag.length * 3);
    // Add points for high vessel count
    riskScore += Math.min(20, vesselCount);
  }

  const normalizedScore = Math.min(100, Math.round(riskScore));

  // Determine risk level
  let riskLevel: GFWIUURiskAssessment['riskLevel'];
  if (normalizedScore >= 70) {
    riskLevel = 'critical';
  } else if (normalizedScore >= 40) {
    riskLevel = 'high';
  } else if (normalizedScore >= 20) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'low';
  }

  return {
    mpaId,
    riskLevel,
    riskScore: normalizedScore,
    factors,
    vesselCount,
    highRiskVesselCount: 0, // Cannot determine without vessel-level data
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate IUU risk assessment for an MPA based on fishing effort data
 * Note: Full IUU risk assessment requires vessel-level data from the Events API,
 * which requires specific vessel IDs. This simplified version uses fishing effort
 * as a proxy for risk assessment.
 */
export async function getIUURiskForMPA(
  mpaId: string,
  geometry: GFWRegion,
  _days: number = 90
): Promise<GFWIUURiskAssessment> {
  // Since the Events API requires vessel IDs (not region queries),
  // we calculate a simplified risk score based on fishing effort data
  try {
    const fishingEffort = await getFishingEffortForMPA(mpaId, geometry);
    return calculateIUURiskFromFishingEffort(mpaId, fishingEffort);
  } catch (error) {
    console.error('[GFW] Error calculating IUU risk:', error);
    // Return minimal risk assessment on error
    return {
      mpaId,
      riskLevel: 'low',
      riskScore: 0,
      factors: [],
      vesselCount: 0,
      highRiskVesselCount: 0,
      lastUpdated: Date.now(),
    };
  }
}

// ============================================================================
// Compliance Score Calculation
// ============================================================================

/**
 * Calculate fishing compliance score for an MPA
 * Simplified version that uses a single API call to reduce rate limiting
 */
export async function calculateComplianceScore(
  mpaId: string,
  geometry: GFWRegion,
  protectionLevel: string,
  establishedYear?: number
): Promise<GFWComplianceScore> {
  // Get fishing effort data with a single call
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const dateRangeStr = `${oneYearAgo.toISOString().split('T')[0]},${now.toISOString().split('T')[0]}`;

  // Single API call to get monthly data which we can analyze for compliance
  console.log('[GFW] Calculating compliance score for MPA:', mpaId);
  const monthlyResponse = await getFishingEffortReport({
    datasets: [GFW_DATASETS.FISHING_EFFORT],
    dateRange: dateRangeStr,
    spatialResolution: 'LOW',
    temporalResolution: 'MONTHLY',
    region: geometry,
  });

  // Calculate totals from monthly data
  const totalFishingHours = monthlyResponse.entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const uniqueVessels = new Set(monthlyResponse.entries.map(e => e.vesselId).filter(Boolean));
  const totalVessels = uniqueVessels.size || Math.ceil(totalFishingHours / 100);

  // Calculate compliance based on protection level
  let score: number;
  let violations = 0;

  const isNoTake = protectionLevel.toLowerCase().includes('no-take') ||
                   protectionLevel.toLowerCase().includes('no take') ||
                   protectionLevel.toLowerCase().includes('strict');

  if (isNoTake) {
    // No-take zones: any fishing is a violation
    violations = totalVessels;
    score = totalFishingHours === 0 ? 100 : Math.max(0, 100 - (totalFishingHours * 0.5));
  } else {
    // Partial protection: base score on fishing intensity
    // Lower fishing hours = better compliance
    // Using a baseline of 1000 hours per year as "moderate"
    const intensityRatio = Math.min(1, totalFishingHours / 1000);
    score = Math.max(0, 100 - (intensityRatio * 50));
    violations = Math.floor(totalFishingHours / 500);
  }

  // Process monthly trend for trend analysis
  const monthlyTrend = monthlyResponse.entries
    .filter(e => e.date)
    .reduce((acc, e) => {
      const month = e.date!.substring(0, 7);
      const existing = acc.find(m => m.month === month);
      if (existing) {
        existing.fishingHours += e.hours;
      } else {
        acc.push({ month, fishingHours: e.hours });
      }
      return acc;
    }, [] as { month: string; fishingHours: number }[])
    .sort((a, b) => a.month.localeCompare(b.month));

  // Calculate trend from monthly data
  let trend: GFWComplianceScore['trend'] = 'stable';
  if (monthlyTrend.length >= 6) {
    const recentMonths = monthlyTrend.slice(-3);
    const earlierMonths = monthlyTrend.slice(-6, -3);

    const recentAvg = recentMonths.reduce((sum, m) => sum + m.fishingHours, 0) / recentMonths.length;
    const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.fishingHours, 0) / earlierMonths.length;

    if (earlierAvg > 0) {
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
      if (change < -20) trend = 'improving';
      else if (change > 20) trend = 'declining';
    }
  }

  // Calculate protection effectiveness (simplified)
  let protectionEffectiveness = 0;
  if (establishedYear) {
    const yearsProtected = new Date().getFullYear() - establishedYear;
    // Longer protection typically means better enforcement
    protectionEffectiveness = Math.min(75, 25 + (yearsProtected * 5));
  }

  // Determine confidence based on data availability
  const confidence: GFWComplianceScore['confidence'] =
    monthlyTrend.length >= 12 ? 'high' :
    monthlyTrend.length >= 6 ? 'medium' : 'low';

  return {
    mpaId,
    score: Math.round(score),
    fishingHoursInside: totalFishingHours,
    fishingHoursBuffer: 0, // Not calculating buffer to reduce API calls
    violations,
    trend,
    confidence,
    protectionEffectiveness,
    lastUpdated: Date.now(),
  };
}

/**
 * Expand a geometry by a rough degree offset (simplified buffer)
 */
function expandGeometry(geometry: GFWRegion, degreeOffset: number): GFWRegion {
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    const expandedCoords = coords.map(ring =>
      ring.map(point => [
        point[0] + (point[0] > 0 ? degreeOffset : -degreeOffset),
        point[1] + (point[1] > 0 ? degreeOffset : -degreeOffset),
      ])
    );
    return { type: 'Polygon', coordinates: expandedCoords };
  }

  // For MultiPolygon, expand each polygon
  const coords = geometry.coordinates as number[][][][];
  const expandedCoords = coords.map(polygon =>
    polygon.map(ring =>
      ring.map(point => [
        point[0] + (point[0] > 0 ? degreeOffset : -degreeOffset),
        point[1] + (point[1] > 0 ? degreeOffset : -degreeOffset),
      ])
    )
  );
  return { type: 'MultiPolygon', coordinates: expandedCoords };
}

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
