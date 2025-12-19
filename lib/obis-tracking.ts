/**
 * OBIS Tracking Data Service
 * Fetches and processes satellite tracking data for marine megafauna
 */

import {
  TrackingPoint,
  TrackingPath,
  HeatmapPoint,
  MPATrackingSummary,
  TrackingCache,
  TRACKING_BASIS_OF_RECORD,
  TRACKED_SPECIES_GROUPS
} from '@/types/obis-tracking';
import { openDB } from 'idb';
import type { OceanPulseDB } from './offline-storage';

const OBIS_API_BASE = 'https://api.obis.org/v3';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const REQUEST_DELAY = 1000; // 1 second between requests

// Helper to delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get IndexedDB instance
async function getDB() {
  return openDB<OceanPulseDB>('ocean-pulse-db', 4);
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if a point is within a polygon (MPA boundary)
 */
function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];

    const intersect = ((yi > lat) !== (yj > lat))
        && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculate minimum distance from point to MPA boundary
 */
function distanceToMPA(lat: number, lon: number, boundary: [number, number][]): number {
  let minDistance = Infinity;

  for (const point of boundary) {
    const dist = calculateDistance(lat, lon, point[0], point[1]);
    minDistance = Math.min(minDistance, dist);
  }

  return minDistance;
}

/**
 * Get all tracked species genera for filtering
 */
function getTrackedGenera(): string[] {
  return Object.values(TRACKED_SPECIES_GROUPS).flat();
}

/**
 * Fetch tracking data from OBIS API
 */
export async function fetchTrackingData(
  mpaId: string,
  wkt: string,
  mpaBoundary: [number, number][],
  onProgress?: (progress: number) => void
): Promise<MPATrackingSummary> {
  try {
    console.log('[Tracking] Starting fetch for MPA:', mpaId);
    console.log('[Tracking] WKT:', wkt);
    console.log('[Tracking] Boundary points:', mpaBoundary.length);

    onProgress?.(10);

    // Build query for tracking data
    const trackedGenera = getTrackedGenera();
    const basisOfRecord = TRACKING_BASIS_OF_RECORD.join(',');

    console.log('[Tracking] Tracked genera:', trackedGenera);
    console.log('[Tracking] Basis of record:', basisOfRecord);

    // Fetch data in batches by species group
    const allRecords: any[] = [];
    let processed = 0;
    const totalGroups = Object.keys(TRACKED_SPECIES_GROUPS).length;

    onProgress?.(20);

    for (const [groupName, genera] of Object.entries(TRACKED_SPECIES_GROUPS)) {
      console.log(`[Tracking] Fetching ${groupName}...`);

      for (const genus of genera) {
        try {
          const url = `${OBIS_API_BASE}/occurrence?geometry=${encodeURIComponent(wkt)}&scientificname=${genus}&basisofrecord=${basisOfRecord}&size=1000`;

          console.log(`[Tracking] Querying ${genus}:`, url);

          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`[Tracking] Failed to fetch tracking data for ${genus}:`, response.statusText);
            continue;
          }

          const data = await response.json();
          console.log(`[Tracking] ${genus} returned ${data.results?.length || 0} records`);

          if (data.results && Array.isArray(data.results)) {
            allRecords.push(...data.results);
          }

          await delay(REQUEST_DELAY);
        } catch (error) {
          console.warn(`[Tracking] Error fetching tracking data for ${genus}:`, error);
        }
      }

      processed++;
      onProgress?.(20 + (processed / totalGroups) * 60);
    }

    console.log(`[Tracking] Total records fetched: ${allRecords.length}`);

    onProgress?.(80);

    // Process tracking points
    const trackingPoints = processTrackingPoints(allRecords, mpaBoundary);

    onProgress?.(85);

    // Group into paths by individual
    const paths = groupIntoPaths(trackingPoints, mpaBoundary);

    onProgress?.(90);

    // Generate heatmap data
    const heatmapData = generateHeatmapData(trackingPoints);

    onProgress?.(95);

    // Calculate species breakdown
    const speciesBreakdown = calculateSpeciesBreakdown(paths);

    // Build summary
    const summary: MPATrackingSummary = {
      mpaId,
      trackedIndividuals: paths.length,
      species: [...new Set(paths.map(p => p.scientificName))],
      paths,
      heatmapData,
      speciesBreakdown,
      dataQuality: {
        trackingRecords: trackingPoints.length,
        dateRange: calculateDateRange(trackingPoints),
      },
      lastUpdated: Date.now(),
    };

    onProgress?.(100);
    return summary;

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    throw error;
  }
}

/**
 * Process raw OBIS records into tracking points
 */
function processTrackingPoints(
  records: any[],
  mpaBoundary: [number, number][]
): TrackingPoint[] {
  const points: TrackingPoint[] = [];

  for (const record of records) {
    // Skip if missing essential data
    if (!record.decimalLatitude || !record.decimalLongitude || !record.scientificName) {
      continue;
    }

    const lat = parseFloat(record.decimalLatitude);
    const lon = parseFloat(record.decimalLongitude);

    // Check if within MPA
    const withinMPA = pointInPolygon(lat, lon, mpaBoundary);
    const distToMPA = withinMPA ? 0 : distanceToMPA(lat, lon, mpaBoundary);

    const point: TrackingPoint = {
      id: record.id || `${record.occurrenceID}-${Date.now()}`,
      occurrenceID: record.occurrenceID || record.id,
      scientificName: record.scientificName,
      commonName: record.vernacularName || getCommonName(record.scientificName),
      latitude: lat,
      longitude: lon,
      timestamp: record.eventDate || record.dateIdentified || new Date().toISOString(),
      tagID: record.organismID,
      individualID: record.individualID || record.organismID || record.catalogNumber,
      sex: record.sex,
      lifeStage: record.lifeStage,
      withinMPA,
      distanceToMPA: parseFloat(distToMPA.toFixed(2)),
      basisOfRecord: record.basisOfRecord,
    };

    points.push(point);
  }

  return points;
}

/**
 * Group tracking points into paths by individual
 */
function groupIntoPaths(
  points: TrackingPoint[],
  mpaBoundary: [number, number][]
): TrackingPath[] {
  // Group by individualID
  const groupedByIndividual = new Map<string, TrackingPoint[]>();

  for (const point of points) {
    if (!point.individualID) continue;

    if (!groupedByIndividual.has(point.individualID)) {
      groupedByIndividual.set(point.individualID, []);
    }
    groupedByIndividual.get(point.individualID)!.push(point);
  }

  // Create paths
  const paths: TrackingPath[] = [];

  for (const [individualID, individualPoints] of groupedByIndividual.entries()) {
    // Sort points by timestamp
    const sortedPoints = individualPoints.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate MPA metrics
    const metrics = calculateMPAMetrics(sortedPoints);

    const path: TrackingPath = {
      individualID,
      scientificName: sortedPoints[0].scientificName,
      commonName: sortedPoints[0].commonName,
      points: sortedPoints,
      mpaMetrics: metrics,
    };

    paths.push(path);
  }

  return paths;
}

/**
 * Calculate MPA interaction metrics for a tracking path
 */
function calculateMPAMetrics(points: TrackingPoint[]) {
  const pointsInMPA = points.filter(p => p.withinMPA);

  if (pointsInMPA.length === 0) {
    return {
      residencyTimeHours: 0,
      boundaryCrossings: 0,
      percentTimeInMPA: 0,
      firstSighting: points[0].timestamp,
      lastSighting: points[points.length - 1].timestamp,
    };
  }

  // Calculate residency time (approximate based on time between first and last sighting in MPA)
  const firstInMPA = pointsInMPA[0];
  const lastInMPA = pointsInMPA[pointsInMPA.length - 1];
  const residencyMs = new Date(lastInMPA.timestamp).getTime() - new Date(firstInMPA.timestamp).getTime();
  const residencyTimeHours = residencyMs / (1000 * 60 * 60);

  // Count boundary crossings
  let boundaryCrossings = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].withinMPA !== points[i - 1].withinMPA) {
      boundaryCrossings++;
    }
  }

  // Calculate percent time in MPA
  const percentTimeInMPA = (pointsInMPA.length / points.length) * 100;

  return {
    residencyTimeHours: parseFloat(residencyTimeHours.toFixed(2)),
    boundaryCrossings,
    percentTimeInMPA: parseFloat(percentTimeInMPA.toFixed(1)),
    firstSighting: firstInMPA.timestamp,
    lastSighting: lastInMPA.timestamp,
  };
}

/**
 * Generate heatmap data from tracking points
 */
function generateHeatmapData(points: TrackingPoint[]): HeatmapPoint[] {
  // Grid-based aggregation for heatmap
  const gridSize = 0.1; // ~10km grid cells
  const grid = new Map<string, { lat: number; lng: number; count: number }>();

  for (const point of points) {
    const gridLat = Math.round(point.latitude / gridSize) * gridSize;
    const gridLng = Math.round(point.longitude / gridSize) * gridSize;
    const key = `${gridLat},${gridLng}`;

    if (!grid.has(key)) {
      grid.set(key, { lat: gridLat, lng: gridLng, count: 0 });
    }
    grid.get(key)!.count++;
  }

  // Convert to heatmap points with normalized intensity
  const maxCount = Math.max(...Array.from(grid.values()).map(g => g.count));

  return Array.from(grid.values()).map(cell => ({
    lat: cell.lat,
    lng: cell.lng,
    intensity: cell.count / maxCount, // Normalize 0-1
  }));
}

/**
 * Calculate species breakdown statistics
 */
function calculateSpeciesBreakdown(paths: TrackingPath[]) {
  const speciesMap = new Map<string, {
    scientificName: string;
    commonName: string;
    individuals: TrackingPath[];
  }>();

  for (const path of paths) {
    if (!speciesMap.has(path.scientificName)) {
      speciesMap.set(path.scientificName, {
        scientificName: path.scientificName,
        commonName: path.commonName,
        individuals: [],
      });
    }
    speciesMap.get(path.scientificName)!.individuals.push(path);
  }

  return Array.from(speciesMap.values()).map(species => {
    const avgResidency = species.individuals.reduce((sum, ind) =>
      sum + ind.mpaMetrics.residencyTimeHours, 0
    ) / species.individuals.length;

    return {
      scientificName: species.scientificName,
      commonName: species.commonName,
      count: species.individuals.length,
      avgResidencyHours: parseFloat(avgResidency.toFixed(2)),
    };
  }).sort((a, b) => b.count - a.count);
}

/**
 * Calculate date range from tracking points
 */
function calculateDateRange(points: TrackingPoint[]) {
  if (points.length === 0) {
    return { start: new Date().toISOString(), end: new Date().toISOString() };
  }

  const dates = points.map(p => new Date(p.timestamp).getTime()).sort();

  return {
    start: new Date(dates[0]).toISOString(),
    end: new Date(dates[dates.length - 1]).toISOString(),
  };
}

/**
 * Get common name for species (fallback)
 */
function getCommonName(scientificName: string): string {
  const commonNames: Record<string, string> = {
    'Balaenoptera': 'Baleen Whale',
    'Megaptera': 'Humpback Whale',
    'Physeter': 'Sperm Whale',
    'Orcinus': 'Orca',
    'Tursiops': 'Bottlenose Dolphin',
    'Caretta': 'Loggerhead Turtle',
    'Chelonia': 'Green Turtle',
    'Carcharodon': 'Great White Shark',
    'Rhincodon': 'Whale Shark',
  };

  const genus = scientificName.split(' ')[0];
  return commonNames[genus] || scientificName;
}

/**
 * Cache management functions
 */

export async function getCachedTrackingSummary(mpaId: string): Promise<MPATrackingSummary | null> {
  try {
    const db = await getDB();
    const cached = await db.get('tracking-cache', mpaId);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      await db.delete('tracking-cache', mpaId);
      return null;
    }

    return cached.summary;
  } catch (error) {
    console.error('Error reading tracking cache:', error);
    return null;
  }
}

export async function cacheTrackingSummary(summary: MPATrackingSummary): Promise<void> {
  try {
    const db = await getDB();
    const cache: TrackingCache = {
      id: summary.mpaId,
      mpaId: summary.mpaId,
      summary,
      lastFetched: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    };

    await db.put('tracking-cache', cache);
  } catch (error) {
    console.error('Error caching tracking summary:', error);
  }
}
