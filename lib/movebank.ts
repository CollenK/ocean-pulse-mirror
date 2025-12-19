/**
 * Movebank API Service
 * Fetches real animal tracking/telemetry data from the Movebank database
 * https://github.com/movebank/movebank-api-doc
 */

import {
  TrackingPoint,
  TrackingPath,
  HeatmapPoint,
  MPATrackingSummary,
  TrackingCache,
} from '@/types/obis-tracking';
import { initDB } from './offline-storage';
import { INDICATOR_SPECIES, findByScientificName } from '@/data/indicator-species';
import { getIndicatorSpeciesForMPA } from './indicator-species';

const MOVEBANK_API_BASE = 'https://www.movebank.org/movebank/service/public/json';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_VERSION = 'v1-movebank'; // Version to invalidate old caches
const REQUEST_DELAY = 1500; // 1.5 seconds between requests (rate limit: 1 concurrent per IP)

// Rate limiter
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
 * Marine taxa commonly tracked in Movebank
 * These are ITIS taxon IDs for marine megafauna groups
 */
const MARINE_TAXA = {
  // Sea turtles
  seaTurtles: {
    family: 'Cheloniidae',
    genera: ['Caretta', 'Chelonia', 'Eretmochelys', 'Lepidochelys', 'Dermochelys'],
  },
  // Sharks and rays
  elasmobranchs: {
    genera: ['Carcharodon', 'Galeocerdo', 'Sphyrna', 'Rhincodon', 'Carcharhinus', 'Isurus', 'Prionace'],
  },
  // Marine mammals
  cetaceans: {
    genera: ['Balaenoptera', 'Megaptera', 'Physeter', 'Orcinus', 'Tursiops', 'Delphinus', 'Stenella'],
  },
  pinnipeds: {
    genera: ['Phoca', 'Halichoerus', 'Mirounga', 'Arctocephalus', 'Zalophus'],
  },
  // Seabirds
  seabirds: {
    genera: ['Phoebastria', 'Diomedea', 'Procellaria', 'Puffinus', 'Sula', 'Fregata'],
  },
};

// Flatten all marine genera for quick lookup
const MARINE_GENERA = new Set([
  ...MARINE_TAXA.seaTurtles.genera,
  ...MARINE_TAXA.elasmobranchs.genera,
  ...MARINE_TAXA.cetaceans.genera,
  ...MARINE_TAXA.pinnipeds.genera,
  ...MARINE_TAXA.seabirds.genera,
]);

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
 * Create empty summary for cases with no data
 */
function createEmptySummary(mpaId: string): MPATrackingSummary {
  return {
    mpaId,
    trackedIndividuals: 0,
    species: [],
    paths: [],
    heatmapData: [],
    speciesBreakdown: [],
    dataQuality: {
      trackingRecords: 0,
      dateRange: { start: new Date().toISOString(), end: new Date().toISOString() },
    },
    lastUpdated: Date.now(),
  };
}

interface MovebankStudy {
  id: number;
  name: string;
  main_location_lat: number;
  main_location_long: number;
  number_of_individuals: number;
  number_of_deployed_locations: number;
  taxon_ids: string;
  timestamp_start: number;
  timestamp_end: number;
  i_have_download_access: boolean;
  there_are_data_which_i_cannot_see: boolean;
}

interface MovebankEvent {
  location_lat: number;
  location_long: number;
  timestamp: number; // milliseconds since epoch
  individual_id: number;
  individual_local_identifier?: string;
  tag_id?: number;
  study_id: number;
  ground_speed?: number;
  heading?: number;
  visible: boolean;
}

interface MovebankIndividual {
  id: number;
  local_identifier: string;
  taxon_canonical_name?: string;
  sex?: string;
  life_stage?: string;
}

/**
 * Fetch public studies from Movebank
 * Filters for marine species studies near the MPA
 */
async function fetchMarineStudiesNearMPA(
  center: [number, number],
  radiusKm: number = 500
): Promise<MovebankStudy[]> {
  await rateLimit();

  try {
    // Fetch all public studies - Movebank doesn't support geographic filtering directly
    const url = `${MOVEBANK_API_BASE}?entity_type=study&i_can_see_data=true&license_type=CC_0,CC_BY,CC_BY_NC`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('[Movebank] Failed to fetch studies:', response.status);
      return [];
    }

    const studies: MovebankStudy[] = await response.json();

    // Filter studies:
    // 1. Within radius of MPA center
    // 2. Have location data
    // 3. Have marine species (based on taxon or study name)
    const marineStudies = studies.filter(study => {
      // Must have location data
      if (!study.main_location_lat || !study.main_location_long) return false;
      if (!study.number_of_deployed_locations || study.number_of_deployed_locations === 0) return false;

      // Check distance from MPA
      const distance = calculateDistance(
        center[0], center[1],
        study.main_location_lat, study.main_location_long
      );
      if (distance > radiusKm) return false;

      // Check if it's a marine study (by name or taxa)
      const studyNameLower = study.name.toLowerCase();
      const marineKeywords = ['sea turtle', 'shark', 'whale', 'dolphin', 'seal', 'albatross',
        'marine', 'ocean', 'coral', 'reef', 'coastal', 'seabird', 'penguin',
        'loggerhead', 'green turtle', 'hawksbill', 'leatherback', 'tiger shark',
        'white shark', 'hammerhead', 'manta', 'ray'];

      const hasMarineKeyword = marineKeywords.some(kw => studyNameLower.includes(kw));

      return hasMarineKeyword || study.i_have_download_access;
    });

    console.log(`[Movebank] Found ${marineStudies.length} marine studies near MPA`);
    return marineStudies;

  } catch (error) {
    console.error('[Movebank] Error fetching studies:', error);
    return [];
  }
}

/**
 * Fetch individuals from a study
 */
async function fetchStudyIndividuals(studyId: number): Promise<MovebankIndividual[]> {
  await rateLimit();

  try {
    const url = `${MOVEBANK_API_BASE}?entity_type=individual&study_id=${studyId}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('[Movebank] Failed to fetch individuals:', response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('[Movebank] Error fetching individuals:', error);
    return [];
  }
}

/**
 * Fetch tracking events from a study
 * Limited to last 2 years of data to avoid huge responses
 */
async function fetchStudyEvents(
  studyId: number,
  maxEvents: number = 5000
): Promise<MovebankEvent[]> {
  await rateLimit();

  try {
    // Get data from last 2 years
    const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000);

    const url = `${MOVEBANK_API_BASE}?entity_type=event&study_id=${studyId}&timestamp_start=${twoYearsAgo}&sensor_type_id=653&max_events_per_individual=${Math.floor(maxEvents / 10)}`;

    const response = await fetch(url);
    if (!response.ok) {
      // May be rate limited or unauthorized
      if (response.status === 403) {
        console.log(`[Movebank] Study ${studyId} requires authentication, skipping`);
      } else {
        console.error('[Movebank] Failed to fetch events:', response.status);
      }
      return [];
    }

    const events: MovebankEvent[] = await response.json();

    // Filter to only visible (non-outlier) events with valid coordinates
    return events.filter(e =>
      e.visible !== false &&
      e.location_lat &&
      e.location_long &&
      !isNaN(e.location_lat) &&
      !isNaN(e.location_long)
    );

  } catch (error) {
    console.error('[Movebank] Error fetching events:', error);
    return [];
  }
}

/**
 * Get common name for a species
 */
function getCommonName(scientificName: string): string {
  // Check indicator species database first
  const indicator = findByScientificName(scientificName);
  if (indicator) {
    return indicator.commonName;
  }

  // Fallback to genus-based mapping
  const genusNames: Record<string, string> = {
    'Caretta': 'Loggerhead Sea Turtle',
    'Chelonia': 'Green Sea Turtle',
    'Eretmochelys': 'Hawksbill Sea Turtle',
    'Lepidochelys': 'Olive Ridley Sea Turtle',
    'Dermochelys': 'Leatherback Sea Turtle',
    'Carcharodon': 'Great White Shark',
    'Galeocerdo': 'Tiger Shark',
    'Sphyrna': 'Hammerhead Shark',
    'Rhincodon': 'Whale Shark',
    'Carcharhinus': 'Reef Shark',
    'Isurus': 'Mako Shark',
    'Prionace': 'Blue Shark',
    'Balaenoptera': 'Baleen Whale',
    'Megaptera': 'Humpback Whale',
    'Physeter': 'Sperm Whale',
    'Orcinus': 'Orca',
    'Tursiops': 'Bottlenose Dolphin',
    'Phoebastria': 'Albatross',
    'Diomedea': 'Albatross',
    'Mirounga': 'Elephant Seal',
    'Arctocephalus': 'Fur Seal',
  };

  const genus = scientificName?.split(' ')[0];
  return genusNames[genus] || scientificName || 'Unknown Species';
}

/**
 * Process Movebank events into tracking points
 */
function processMovebankEvents(
  events: MovebankEvent[],
  individuals: Map<number, MovebankIndividual>,
  mpaBoundary: [number, number][]
): TrackingPoint[] {
  return events.map(event => {
    const individual = individuals.get(event.individual_id);
    const scientificName = individual?.taxon_canonical_name || 'Unknown';
    const lat = event.location_lat;
    const lon = event.location_long;

    const withinMPA = pointInPolygon(lat, lon, mpaBoundary);
    const distToMPA = withinMPA ? 0 : distanceToMPA(lat, lon, mpaBoundary);

    return {
      id: `mb-${event.study_id}-${event.individual_id}-${event.timestamp}`,
      occurrenceID: `movebank-${event.study_id}-${event.individual_id}`,
      scientificName,
      commonName: getCommonName(scientificName),
      latitude: lat,
      longitude: lon,
      timestamp: new Date(event.timestamp).toISOString(),
      tagID: event.tag_id?.toString(),
      individualID: individual?.local_identifier || event.individual_id.toString(),
      sex: individual?.sex,
      lifeStage: individual?.life_stage,
      withinMPA,
      distanceToMPA: parseFloat(distToMPA.toFixed(2)),
      basisOfRecord: 'MachineObservation', // All Movebank data is from telemetry
      // Movebank-specific fields we could add later
      // groundSpeed: event.ground_speed,
      // heading: event.heading,
    };
  });
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
    // Need at least 2 points to make a path
    if (individualPoints.length < 2) continue;

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

  // Calculate residency time based on time between first and last point in MPA
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
  const gridSize = 0.05; // ~5km grid cells (finer for real tracking data)
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
 * Main function: Fetch tracking data from Movebank for an MPA
 */
export async function fetchMovebankTrackingData(
  mpaId: string,
  center: [number, number],
  mpaBoundary: [number, number][],
  onProgress?: (progress: number) => void,
  mpaInfo?: { latitude: number; longitude: number; name: string; description?: string }
): Promise<MPATrackingSummary> {
  try {
    onProgress?.(5);

    // Step 1: Find marine studies near this MPA
    const studies = await fetchMarineStudiesNearMPA(center, 500);
    onProgress?.(20);

    if (studies.length === 0) {
      console.log('[Movebank] No marine studies found near MPA');
      return createEmptySummary(mpaId);
    }

    // Step 2: Fetch events and individuals from each study
    const allPoints: TrackingPoint[] = [];
    const studyCount = Math.min(studies.length, 5); // Limit to 5 studies to avoid rate limiting

    for (let i = 0; i < studyCount; i++) {
      const study = studies[i];
      onProgress?.(20 + (i / studyCount) * 50);

      console.log(`[Movebank] Fetching data from study: ${study.name}`);

      // Fetch individuals first to get species info
      const individuals = await fetchStudyIndividuals(study.id);
      const individualMap = new Map(individuals.map(ind => [ind.id, ind]));

      // Fetch tracking events
      const events = await fetchStudyEvents(study.id, 2000);

      if (events.length > 0) {
        // Process events into tracking points
        const points = processMovebankEvents(events, individualMap, mpaBoundary);

        // Filter to points within 100km of MPA (broader area for context)
        const relevantPoints = points.filter(p => p.distanceToMPA <= 100);
        allPoints.push(...relevantPoints);
      }
    }

    onProgress?.(75);

    if (allPoints.length === 0) {
      console.log('[Movebank] No tracking points found near MPA');
      return createEmptySummary(mpaId);
    }

    // Step 3: Group into paths
    const paths = groupIntoPaths(allPoints, mpaBoundary);
    onProgress?.(85);

    // Step 4: Generate heatmap data
    const heatmapData = generateHeatmapData(allPoints);
    onProgress?.(90);

    // Step 5: Calculate statistics
    const speciesBreakdown = calculateSpeciesBreakdown(paths);
    const dateRange = calculateDateRange(allPoints);
    onProgress?.(95);

    // Build summary
    const summary: MPATrackingSummary = {
      mpaId,
      trackedIndividuals: paths.length,
      species: [...new Set(paths.map(p => p.scientificName))],
      paths,
      heatmapData,
      speciesBreakdown,
      dataQuality: {
        trackingRecords: allPoints.length,
        dateRange,
      },
      lastUpdated: Date.now(),
    };

    onProgress?.(100);
    console.log(`[Movebank] Found ${paths.length} tracked individuals with ${allPoints.length} points`);

    return summary;

  } catch (error) {
    console.error('[Movebank] Error fetching tracking data:', error);
    throw error;
  }
}

/**
 * Cache management
 */

function getCacheKey(mpaId: string): string {
  return `${mpaId}-${CACHE_VERSION}`;
}

export async function getCachedMovebankSummary(mpaId: string): Promise<MPATrackingSummary | null> {
  try {
    const db = await initDB();
    const cacheKey = getCacheKey(mpaId);
    const cached = await db.get('tracking-cache', cacheKey);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      await db.delete('tracking-cache', cacheKey);
      return null;
    }

    return cached.summary;
  } catch (error) {
    console.error('[Movebank] Cache read error:', error);
    return null;
  }
}

export async function cacheMovebankSummary(summary: MPATrackingSummary): Promise<void> {
  try {
    const db = await initDB();
    const cacheKey = getCacheKey(summary.mpaId);
    const cache: TrackingCache = {
      id: cacheKey,
      mpaId: summary.mpaId,
      summary,
      lastFetched: Date.now(),
      expiresAt: Date.now() + CACHE_TTL,
    };

    await db.put('tracking-cache', cache);
  } catch (error) {
    console.error('[Movebank] Cache write error:', error);
  }
}
