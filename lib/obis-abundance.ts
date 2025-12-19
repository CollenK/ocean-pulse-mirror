/**
 * OBIS Abundance Data Service
 * Fetches and processes temporal abundance data for indicator species in MPAs
 */

import {
  OBISAbundanceRecord,
  AbundanceDataPoint,
  AbundanceTrend,
  MPAAbundanceSummary,
  AbundanceCache,
} from '@/types/obis-abundance';
import { createBoundingBox, getCommonName } from './obis-client';
import { initDB } from './offline-storage';
import { getIndicatorSpeciesForMPA } from './indicator-species';
import { INDICATOR_SPECIES, findByScientificName } from '@/data/indicator-species';

const OBIS_API_BASE = 'https://api.obis.org/v3';
const REQUEST_DELAY = 1000; // 1 second between requests
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_VERSION = 'v3-indicator-presence'; // Version to invalidate old caches

// Simple rate limiter
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY) {
    await new Promise(resolve =>
      setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Get date N years ago in YYYY-MM-DD format
 */
function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}

/**
 * Create WKT polygon from bounds
 */
function createWKTPolygon(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
}): string {
  return `POLYGON((${bounds.west} ${bounds.south}, ${bounds.east} ${bounds.south}, ${bounds.east} ${bounds.north}, ${bounds.west} ${bounds.north}, ${bounds.west} ${bounds.south}))`;
}

// Set of indicator species scientific names for quick lookup
const INDICATOR_SPECIES_NAMES = new Set(
  INDICATOR_SPECIES.map(s => s.scientificName.toLowerCase())
);

// Map of taxon IDs to indicator species for lookup
const INDICATOR_BY_TAXON = new Map(
  INDICATOR_SPECIES.map(s => [s.obisTaxonId, s])
);

/**
 * Check if a species is an indicator species
 */
function isIndicatorSpecies(scientificName: string, taxonId?: number): boolean {
  if (taxonId && INDICATOR_BY_TAXON.has(taxonId)) {
    return true;
  }
  return INDICATOR_SPECIES_NAMES.has(scientificName.toLowerCase());
}

/**
 * Fetch abundance data from OBIS for an MPA
 * Retrieves 10 years of occurrence records with abundance information
 * Filters to only include indicator species relevant to this MPA's ecosystem
 */
export async function fetchAbundanceData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50,
  mpaInfo?: { latitude: number; longitude: number; name: string; description?: string }
): Promise<OBISAbundanceRecord[]> {
  const bounds = createBoundingBox(center, radiusKm);
  const wkt = createWKTPolygon(bounds);

  const startDate = getDateYearsAgo(10); // 10-year lookback
  const endDate = new Date().toISOString().split('T')[0];

  // Get indicator species relevant to this MPA
  let relevantIndicatorSpecies = INDICATOR_SPECIES;
  if (mpaInfo) {
    try {
      relevantIndicatorSpecies = await getIndicatorSpeciesForMPA(mpaInfo);
    } catch (error) {
      console.warn('[Abundance] Could not get MPA-specific indicators, using all:', error);
    }
  }

  // Create lookup set for relevant indicator species
  const relevantNames = new Set(relevantIndicatorSpecies.map(s => s.scientificName.toLowerCase()));
  const relevantTaxonIds = new Set(relevantIndicatorSpecies.map(s => s.obisTaxonId));

  const params = new URLSearchParams({
    geometry: wkt,
    startdate: startDate,
    enddate: endDate,
    size: '1000',
  });

  const allRecords: OBISAbundanceRecord[] = [];
  let offset = 0;
  let hasMore = true;
  let maxRequests = 5; // Limit to 5 requests (5000 records) to avoid long waits

  while (hasMore && maxRequests > 0) {
    await rateLimit();

    params.set('offset', offset.toString());
    const url = `${OBIS_API_BASE}/occurrence?${params}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[Abundance] OBIS API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const results = data.results || [];

      // Filter for indicator species records
      // Include all presence records - use occurrence count as proxy when abundance data unavailable
      const indicatorRecords = results.filter((r: any) => {
        // Check if this is an indicator species
        const scientificName = (r.scientificName || r.scientificname || '').toLowerCase();
        const taxonId = r.taxonID || r.aphiaID;

        const isIndicator = relevantNames.has(scientificName) ||
          (taxonId && relevantTaxonIds.has(taxonId));

        if (!isIndicator) return false;

        // Include presence records (most OBIS data is presence-only)
        return r.occurrenceStatus === 'present' || r.occurrenceStatus === undefined;
      }).map((r: any) => ({
        occurrenceID: r.occurrenceID || r.id,
        scientificName: r.scientificName || r.scientificname,
        genus: r.genus,
        family: r.family,
        eventDate: r.eventDate,
        eventID: r.eventID,
        decimalLatitude: r.decimalLatitude,
        decimalLongitude: r.decimalLongitude,
        // Use individualCount if available, otherwise default to 1 for presence records
        individualCount: r.individualCount || 1,
        organismQuantity: r.organismQuantity,
        organismQuantityType: r.organismQuantityType,
        occurrenceStatus: r.occurrenceStatus || 'present',
        basisOfRecord: r.basisOfRecord,
        datasetID: r.datasetID,
        institutionCode: r.institutionCode,
      }));

      allRecords.push(...indicatorRecords);

      offset += results.length;
      hasMore = results.length === 1000; // Continue if we got max results
      maxRequests--;

    } catch (error) {
      console.error('[Abundance] Fetch error:', error);
      break;
    }
  }

  return allRecords;
}

/**
 * Aggregate abundance records by month
 */
export function aggregateAbundanceByMonth(
  records: OBISAbundanceRecord[]
): Map<string, AbundanceDataPoint> {
  const monthlyData = new Map<string, AbundanceDataPoint>();

  for (const record of records) {
    if (!record.eventDate) continue;

    const monthKey = record.eventDate.substring(0, 7); // YYYY-MM
    const count = record.individualCount || parseInt(record.organismQuantity || '1');

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        date: monthKey,
        count: 0,
        recordCount: 0,
        quality: 'high',
      });
    }

    const dataPoint = monthlyData.get(monthKey)!;
    dataPoint.count += count;
    dataPoint.recordCount += 1;

    // Assess quality based on number of observations
    if (dataPoint.recordCount >= 10) {
      dataPoint.quality = 'high';
    } else if (dataPoint.recordCount >= 5) {
      dataPoint.quality = 'medium';
    } else {
      dataPoint.quality = 'low';
    }
  }

  return monthlyData;
}

/**
 * Simple linear regression to calculate slope
 */
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } {
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calculate trend from data points
 */
export function calculateTrend(dataPoints: AbundanceDataPoint[]): {
  trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  changePercent: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (dataPoints.length < 6) {
    return { trend: 'insufficient_data', changePercent: 0, confidence: 'low' };
  }

  // Sort by date
  const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));

  // Simple linear regression
  const xValues = sorted.map((_, i) => i);
  const yValues = sorted.map(d => d.count);

  const { slope } = linearRegression(xValues, yValues);
  const avgCount = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const changePercent = avgCount > 0 ? (slope / avgCount) * 100 : 0;

  const trend = Math.abs(changePercent) < 5 ? 'stable' :
                changePercent > 0 ? 'increasing' : 'decreasing';

  const confidence = dataPoints.length >= 24 ? 'high' :
                     dataPoints.length >= 12 ? 'medium' : 'low';

  return { trend, changePercent, confidence };
}

/**
 * Process species trends from abundance records
 */
export function processSpeciesTrends(records: OBISAbundanceRecord[]): AbundanceTrend[] {
  // Group records by species
  const speciesGroups = new Map<string, OBISAbundanceRecord[]>();

  for (const record of records) {
    const scientificName = record.scientificName;
    if (!scientificName) continue;

    if (!speciesGroups.has(scientificName)) {
      speciesGroups.set(scientificName, []);
    }
    speciesGroups.get(scientificName)!.push(record);
  }


  // Calculate trends for each species
  const trends: AbundanceTrend[] = [];

  for (const [scientificName, speciesRecords] of speciesGroups) {
    // Aggregate by month
    const monthlyData = aggregateAbundanceByMonth(speciesRecords);
    const dataPoints = Array.from(monthlyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate trend
    const trendData = calculateTrend(dataPoints);

    // Get common name
    const speciesName = getCommonName({
      scientificName,
      genus: speciesRecords[0]?.genus,
      family: speciesRecords[0]?.family,
    });

    trends.push({
      speciesName,
      scientificName,
      dataPoints,
      trend: trendData.trend,
      changePercent: trendData.changePercent,
      confidence: trendData.confidence,
    });
  }

  // Sort by confidence and data points (most reliable first)
  trends.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    if (a.confidence !== b.confidence) {
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    }
    return b.dataPoints.length - a.dataPoints.length;
  });

  return trends;
}

/**
 * Calculate overall biodiversity metrics
 */
export function calculateOverallBiodiversity(speciesTrends: AbundanceTrend[]): {
  speciesCount: number;
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  healthScore: number;
} {
  const validTrends = speciesTrends.filter(t => t.trend !== 'insufficient_data');

  if (validTrends.length === 0) {
    return {
      speciesCount: speciesTrends.length,
      trendDirection: 'stable',
      healthScore: 50,
    };
  }

  // Count trends
  const increasing = validTrends.filter(t => t.trend === 'increasing').length;
  const stable = validTrends.filter(t => t.trend === 'stable').length;
  const decreasing = validTrends.filter(t => t.trend === 'decreasing').length;

  // Determine overall direction
  let trendDirection: 'increasing' | 'stable' | 'decreasing';
  if (increasing > decreasing && increasing > stable * 0.5) {
    trendDirection = 'increasing';
  } else if (decreasing > increasing && decreasing > stable * 0.5) {
    trendDirection = 'decreasing';
  } else {
    trendDirection = 'stable';
  }

  // Calculate health score (0-100)
  const increaseScore = (increasing / validTrends.length) * 50;
  const stableScore = (stable / validTrends.length) * 35;
  const speciesDiversityScore = Math.min(validTrends.length / 10, 1) * 15;

  const healthScore = Math.round(increaseScore + stableScore + speciesDiversityScore);

  return {
    speciesCount: speciesTrends.length,
    trendDirection,
    healthScore,
  };
}

/**
 * Generate versioned cache key to invalidate old caches
 */
function getCacheKey(mpaId: string): string {
  return `${mpaId}-${CACHE_VERSION}`;
}

/**
 * Get cached abundance summary
 */
export async function getCachedAbundanceSummary(
  mpaId: string
): Promise<MPAAbundanceSummary | null> {
  try {
    const db = await initDB();
    const cacheKey = getCacheKey(mpaId);
    const cached = await db.get('abundance-cache', cacheKey) as AbundanceCache | undefined;

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      await db.delete('abundance-cache', cacheKey);
      return null;
    }

    return cached.summary;
  } catch (error) {
    console.error('[Abundance] Cache read error:', error);
    return null;
  }
}

/**
 * Cache abundance summary
 */
export async function cacheAbundanceSummary(
  mpaId: string,
  summary: MPAAbundanceSummary
): Promise<void> {
  try {
    const db = await initDB();
    const cacheKey = getCacheKey(mpaId);
    const cache: AbundanceCache = {
      id: cacheKey,
      mpaId,
      summary,
      lastFetched: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    await db.put('abundance-cache', cache);
  } catch (error) {
    console.error('[Abundance] Cache write error:', error);
  }
}
