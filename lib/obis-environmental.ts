/**
 * OBIS Environmental Data Service
 * Fetches and processes environmental measurements (eMoF) from OBIS
 */

import {
  EnvironmentalMeasurement,
  EnvironmentalDataPoint,
  EnvironmentalParameter,
  EnvironmentalAnomaly,
  MPAEnvironmentalSummary,
  EnvironmentalCache,
  EnvironmentalThreshold,
  PRIORITY_MEASUREMENTS,
  ENVIRONMENTAL_THRESHOLDS,
} from '@/types/obis-environmental';
import { createBoundingBox } from './obis-client';
import { openDB } from 'idb';
import type { OceanPulseDB } from './offline-storage';

const OBIS_API_BASE = 'https://api.obis.org/v3';
const REQUEST_DELAY = 1000; // 1 second between requests
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

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
 * Get database connection
 */
async function getDB() {
  return openDB<OceanPulseDB>('ocean-pulse-db', 4);
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

/**
 * Classify measurement type based on measurement name
 */
function classifyMeasurement(measurementType: string): keyof typeof PRIORITY_MEASUREMENTS | 'other' {
  const normalized = measurementType.toLowerCase();

  // Direct matches for common OBIS fields
  if (normalized.includes('sst') || normalized.includes('sea surface temperature') || normalized.includes('temperature')) {
    return 'temperature';
  }
  if (normalized.includes('sss') || normalized.includes('sea surface salinity') || normalized.includes('salinity')) {
    return 'salinity';
  }
  if (normalized.includes('bathymetry') || normalized.includes('depth')) {
    return 'depth';
  }

  // Check priority measurements
  for (const [type, variations] of Object.entries(PRIORITY_MEASUREMENTS)) {
    if (variations.some(v => normalized.includes(v.toLowerCase()))) {
      return type as keyof typeof PRIORITY_MEASUREMENTS;
    }
  }

  return 'other';
}

/**
 * Fetch environmental measurements from OBIS for an MPA
 * Uses the occurrence endpoint with mof=true to get ExtendedMeasurementOrFact data
 */
export async function fetchEnvironmentalData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50
): Promise<EnvironmentalMeasurement[]> {
  const bounds = createBoundingBox(center, radiusKm);
  const wkt = createWKTPolygon(bounds);

  const startDate = getDateYearsAgo(10); // 10-year lookback
  const endDate = new Date().toISOString().split('T')[0];

  console.log(`[Environmental] Fetching data for MPA ${mpaId}`);
  console.log(`[Environmental] Date range: ${startDate} to ${endDate}`);

  const params = new URLSearchParams({
    geometry: wkt,
    startdate: startDate,
    enddate: endDate,
    mof: 'true', // Enable eMoF (ExtendedMeasurementOrFact) extension
    size: '1000',
  });

  const allMeasurements: EnvironmentalMeasurement[] = [];
  let offset = 0;
  let hasMore = true;
  let maxRequests = 5; // Limit to 5 requests to avoid long waits

  while (hasMore && maxRequests > 0) {
    await rateLimit();

    params.set('offset', offset.toString());
    const url = `${OBIS_API_BASE}/occurrence?${params}`;

    console.log(`[Environmental] Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[Environmental] OBIS API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const results = data.results || [];

      console.log(`[Environmental] Fetched ${results.length} records (offset: ${offset})`);

      // Extract environmental data from occurrences
      for (const record of results) {
        const recordId = record.id || record.occurrenceID || `record-${offset}-${results.indexOf(record)}`;
        const eventDate = record.eventDate || record.date;

        // OBIS provides environmental data as direct fields on each record
        // Extract standard environmental fields
        if (record.bathymetry !== undefined && record.bathymetry !== null) {
          allMeasurements.push({
            measurementID: `${recordId}-bathymetry`,
            occurrenceID: recordId,
            eventID: record.eventID,
            measurementType: 'Depth',
            measurementValue: record.bathymetry,
            measurementUnit: 'm',
            measurementDeterminedDate: eventDate,
            measurementMethod: 'bathymetry',
          });
        }

        if (record.sst !== undefined && record.sst !== null) {
          allMeasurements.push({
            measurementID: `${recordId}-sst`,
            occurrenceID: recordId,
            eventID: record.eventID,
            measurementType: 'Sea surface temperature',
            measurementValue: record.sst,
            measurementUnit: '°C',
            measurementDeterminedDate: eventDate,
            measurementMethod: 'satellite',
          });
        }

        if (record.sss !== undefined && record.sss !== null) {
          allMeasurements.push({
            measurementID: `${recordId}-sss`,
            occurrenceID: recordId,
            eventID: record.eventID,
            measurementType: 'Sea surface salinity',
            measurementValue: record.sss,
            measurementUnit: 'PSU',
            measurementDeterminedDate: eventDate,
            measurementMethod: 'satellite',
          });
        }

        if (record.depth !== undefined && record.depth !== null && !record.bathymetry) {
          allMeasurements.push({
            measurementID: `${recordId}-depth`,
            occurrenceID: recordId,
            eventID: record.eventID,
            measurementType: 'Water depth',
            measurementValue: record.depth,
            measurementUnit: 'm',
            measurementDeterminedDate: eventDate,
            measurementMethod: 'measured',
          });
        }

        // Also check for mof array for additional measurements
        const mofArray = record.mof || record.measurementOrFact || record.measurements || [];
        if (Array.isArray(mofArray) && mofArray.length > 0) {
          for (const mof of mofArray) {
            // Only include measurements that look like environmental parameters
            const type = mof.measurementType || mof.measurementTypeID || '';
            const value = mof.measurementValue;

            // Skip non-numeric or non-environmental measurements
            if (!type || value === undefined || value === null) continue;

            allMeasurements.push({
              measurementID: mof.measurementID || `${recordId}-mof-${mofArray.indexOf(mof)}`,
              occurrenceID: recordId,
              eventID: record.eventID,
              measurementType: type,
              measurementValue: value,
              measurementUnit: mof.measurementUnit || mof.measurementUnitID || '',
              measurementDeterminedDate: eventDate,
              measurementMethod: mof.measurementMethod,
              measurementRemarks: mof.measurementRemarks,
            });
          }
        }
      }

      console.log(`[Environmental] Total measurements so far: ${allMeasurements.length}`);

      offset += results.length;
      hasMore = results.length === 1000;
      maxRequests--;

    } catch (error) {
      console.error('[Environmental] Fetch error:', error);
      break;
    }
  }

  console.log(`[Environmental] Final count: ${allMeasurements.length} measurements`);
  return allMeasurements;
}

/**
 * Process measurements into parameters
 */
export function processEnvironmentalParameters(
  measurements: EnvironmentalMeasurement[]
): EnvironmentalParameter[] {
  // Group measurements by type
  const measurementsByType = new Map<string, EnvironmentalMeasurement[]>();

  for (const measurement of measurements) {
    const type = classifyMeasurement(measurement.measurementType);
    if (type === 'other') continue; // Skip non-priority measurements

    if (!measurementsByType.has(type)) {
      measurementsByType.set(type, []);
    }
    measurementsByType.get(type)!.push(measurement);
  }

  console.log(`[Environmental] Processing ${measurementsByType.size} parameter types`);

  const parameters: EnvironmentalParameter[] = [];

  for (const [type, typeMeasurements] of measurementsByType) {
    // Extract numeric values
    const values = typeMeasurements
      .map(m => {
        const val = typeof m.measurementValue === 'number'
          ? m.measurementValue
          : parseFloat(m.measurementValue as string);
        return isNaN(val) ? null : val;
      })
      .filter((v): v is number => v !== null);

    if (values.length === 0) continue;

    // Calculate statistics
    const currentValue = values[values.length - 1]; // Most recent
    const historicalAvg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Aggregate by month
    const monthlyData = aggregateByMonth(typeMeasurements);
    const dataPoints = Array.from(monthlyData.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Calculate trend
    const trend = calculateEnvironmentalTrend(dataPoints);

    // Get threshold and status
    const threshold = evaluateThreshold(type, currentValue);

    // Get unit (take most common)
    const units = typeMeasurements.map(m => m.measurementUnit).filter(Boolean);
    const unit = getMostCommon(units) || '';

    // Format name
    const name = formatParameterName(type);

    parameters.push({
      name,
      type: type as any,
      currentValue,
      unit,
      historicalAvg,
      min,
      max,
      trend,
      dataPoints,
      threshold,
    });
  }

  console.log(`[Environmental] Generated ${parameters.length} parameters`);
  return parameters;
}

/**
 * Aggregate measurements by month
 */
function aggregateByMonth(
  measurements: EnvironmentalMeasurement[]
): Map<string, EnvironmentalDataPoint> {
  const monthlyData = new Map<string, { sum: number; count: number; unit: string }>();

  for (const measurement of measurements) {
    if (!measurement.measurementDeterminedDate) continue;

    const monthKey = measurement.measurementDeterminedDate.substring(0, 7); // YYYY-MM
    const value = typeof measurement.measurementValue === 'number'
      ? measurement.measurementValue
      : parseFloat(measurement.measurementValue as string);

    if (isNaN(value)) continue;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        sum: 0,
        count: 0,
        unit: measurement.measurementUnit || '',
      });
    }

    const data = monthlyData.get(monthKey)!;
    data.sum += value;
    data.count += 1;
  }

  // Convert to data points
  const dataPoints = new Map<string, EnvironmentalDataPoint>();
  for (const [date, data] of monthlyData) {
    dataPoints.set(date, {
      date,
      value: data.sum / data.count, // Average for the month
      unit: data.unit,
      quality: data.count >= 10 ? 'high' : data.count >= 5 ? 'medium' : 'low',
    });
  }

  return dataPoints;
}

/**
 * Calculate trend from data points
 */
function calculateEnvironmentalTrend(
  dataPoints: EnvironmentalDataPoint[]
): 'increasing' | 'stable' | 'decreasing' {
  if (dataPoints.length < 6) return 'stable';

  // Simple linear regression
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map(d => d.value);

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const avgY = sumY / n;

  const changePercent = avgY !== 0 ? (slope / avgY) * 100 : 0;

  return Math.abs(changePercent) < 5 ? 'stable' :
         changePercent > 0 ? 'increasing' : 'decreasing';
}

/**
 * Evaluate threshold status
 */
function evaluateThreshold(
  type: string,
  value: number
): EnvironmentalThreshold | undefined {
  const thresholds = ENVIRONMENTAL_THRESHOLDS[type];
  if (!thresholds) return undefined;

  let status: 'normal' | 'warning' | 'critical' = 'normal';

  if (thresholds.criticalMin !== undefined && value < thresholds.criticalMin) {
    status = 'critical';
  } else if (thresholds.criticalMax !== undefined && value > thresholds.criticalMax) {
    status = 'critical';
  } else if (thresholds.warningMin !== undefined && value < thresholds.warningMin) {
    status = 'warning';
  } else if (thresholds.warningMax !== undefined && value > thresholds.warningMax) {
    status = 'warning';
  }

  return {
    ...thresholds,
    status,
  };
}

/**
 * Detect environmental anomalies
 */
export function detectAnomalies(
  dataPoints: EnvironmentalDataPoint[],
  threshold: EnvironmentalThreshold | undefined
): EnvironmentalAnomaly[] {
  if (dataPoints.length < 10) return [];

  const anomalies: EnvironmentalAnomaly[] = [];
  const values = dataPoints.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );

  // Detect outliers (>2 std devs from mean)
  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    const zScore = Math.abs((point.value - mean) / stdDev);

    if (zScore > 2) {
      anomalies.push({
        parameter: 'environmental',
        type: point.value > mean ? 'spike' : 'drop',
        severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
        startDate: point.date,
        description: `Unusual ${point.value > mean ? 'increase' : 'decrease'} detected (${zScore.toFixed(1)}σ from mean)`,
      });
    }
  }

  return anomalies;
}

/**
 * Calculate habitat quality score
 */
export function calculateHabitatQualityScore(
  parameters: EnvironmentalParameter[]
): number {
  if (parameters.length === 0) return 0;

  let totalScore = 0;
  let maxScore = 0;

  for (const param of parameters) {
    maxScore += 100;

    // Score based on threshold status
    if (!param.threshold) {
      totalScore += 75; // No threshold = assume okay
    } else {
      switch (param.threshold.status) {
        case 'normal':
          totalScore += 100;
          break;
        case 'warning':
          totalScore += 60;
          break;
        case 'critical':
          totalScore += 20;
          break;
      }
    }
  }

  return Math.round((totalScore / maxScore) * 100);
}

/**
 * Get most common element in array
 */
function getMostCommon(arr: string[]): string {
  if (arr.length === 0) return '';
  const counts = new Map<string, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return Array.from(counts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

/**
 * Format parameter name for display
 */
function formatParameterName(type: string): string {
  const names: Record<string, string> = {
    temperature: 'Water Temperature',
    salinity: 'Salinity',
    depth: 'Depth',
    pH: 'pH Level',
    oxygen: 'Dissolved Oxygen',
    substrate: 'Substrate Type',
    chlorophyll: 'Chlorophyll',
  };
  return names[type] || type;
}

/**
 * Get cached environmental summary
 */
export async function getCachedEnvironmentalSummary(
  mpaId: string
): Promise<MPAEnvironmentalSummary | null> {
  try {
    const db = await getDB();
    const cached = await db.get('environmental-cache', mpaId) as EnvironmentalCache | undefined;

    if (!cached) {
      console.log(`[Environmental] No cache found for MPA ${mpaId}`);
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      console.log(`[Environmental] Cache expired for MPA ${mpaId}`);
      await db.delete('environmental-cache', mpaId);
      return null;
    }

    console.log(`[Environmental] Cache hit for MPA ${mpaId}`);
    return cached.summary;
  } catch (error) {
    console.error('[Environmental] Cache read error:', error);
    return null;
  }
}

/**
 * Cache environmental summary
 */
export async function cacheEnvironmentalSummary(
  mpaId: string,
  summary: MPAEnvironmentalSummary
): Promise<void> {
  try {
    const db = await getDB();
    const cache: EnvironmentalCache = {
      id: mpaId,
      mpaId,
      summary,
      lastFetched: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    await db.put('environmental-cache', cache);
    console.log(`[Environmental] Cached summary for MPA ${mpaId}`);
  } catch (error) {
    console.error('[Environmental] Cache write error:', error);
  }
}
