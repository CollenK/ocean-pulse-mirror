/**
 * Wind Farm Data Service
 *
 * Fetches offshore wind farm polygon data from two complementary sources:
 *
 * 1. EMODnet Human Activities (primary, 600 polygon features across Europe)
 *    WFS: https://ows.emodnet-humanactivities.eu/wfs
 *    Layer: emodnet:windfarmspoly
 *    Fields: country, name, n_turbines, power_mw, status, year, dist_coast, area_sqkm
 *
 * 2. OSPAR Offshore Renewables (complement, 278 features, richer metadata)
 *    WFS: https://odims.ospar.org/geoserver/ows
 *    Layer: odims:ospar_offshore_renewables_2024_01_001
 *    Extra fields: Operator, Foundation, Water_dept, EIA, Device_Typ
 *    License: CC0 (Public Domain)
 *
 * Both are free, public OGC WFS endpoints. No API keys required.
 * The merge strategy uses EMODnet as the geometry baseline (wider coverage)
 * and enriches matching records with OSPAR metadata (operator, foundation, etc.).
 */

import type {
  WindFarm,
  WindFarmStatus,
  WindFarmSource,
  EMODnetWindFarmResponse,
  EMODnetWindFarmFeature,
  OSPARWindFarmResponse,
  OSPARWindFarmFeature,
  WindFarmMPAConflict,
  WindFarmSummary,
} from '@/types/wind-farms';
import type { MPA } from '@/types';

const EMODNET_WFS_BASE = 'https://ows.emodnet-humanactivities.eu/wfs';
const EMODNET_LAYER = 'emodnet:windfarmspoly';

const OSPAR_WFS_BASE = 'https://odims.ospar.org/geoserver/ows';
const OSPAR_LAYER = 'odims:ospar_offshore_renewables_2024_01_001';

// --- EMODnet fetching ---

/**
 * Fetch all offshore wind farm polygons from EMODnet WFS.
 */
async function fetchEMODnetWindFarms(): Promise<WindFarm[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: EMODNET_LAYER,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  });

  const url = `${EMODNET_WFS_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`EMODnet WFS request failed: ${response.status} ${response.statusText}`);
  }

  const data: EMODnetWindFarmResponse = await response.json();

  return data.features
    .filter((f) => f.geometry !== null)
    .map(transformEMODnetFeature);
}

// --- OSPAR fetching ---

/**
 * Fetch offshore renewable energy installations from OSPAR WFS.
 * Includes wind turbines, tidal stream, wave energy devices.
 */
async function fetchOSPARWindFarms(): Promise<WindFarm[]> {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: OSPAR_LAYER,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  });

  const url = `${OSPAR_WFS_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`OSPAR WFS request failed: ${response.status} ${response.statusText}`);
  }

  const data: OSPARWindFarmResponse = await response.json();

  return data.features
    .filter((f) => f.geometry !== null)
    .map(transformOSPARFeature);
}

// --- Merged fetch ---

/**
 * Fetch wind farms from both EMODnet and OSPAR, then merge.
 *
 * Strategy:
 * - EMODnet provides the geometry baseline (wider European coverage, 600 features)
 * - OSPAR provides richer metadata (operator, foundation, EIA) for NE Atlantic (278 features)
 * - Records are matched by normalized name + country
 * - Matched records get OSPAR metadata merged into the EMODnet record
 * - Unmatched OSPAR records (e.g. wave/tidal not in EMODnet) are added separately
 *
 * If OSPAR fetch fails, falls back to EMODnet-only data gracefully.
 */
export async function fetchWindFarms(): Promise<WindFarm[]> {
  // Fetch both sources in parallel; OSPAR failure is non-fatal
  const [emodnetFarms, osparFarms] = await Promise.all([
    fetchEMODnetWindFarms(),
    fetchOSPARWindFarms().catch((err) => {
      console.warn('[WindFarmService] OSPAR fetch failed, using EMODnet only:', err.message);
      return [] as WindFarm[];
    }),
  ]);

  if (osparFarms.length === 0) {
    return emodnetFarms;
  }

  return mergeWindFarmSources(emodnetFarms, osparFarms);
}

/**
 * Merge EMODnet and OSPAR wind farm datasets.
 * Enriches EMODnet records with OSPAR metadata where names match.
 * Adds OSPAR-only records (e.g. wave/tidal devices) that are not in EMODnet.
 */
function mergeWindFarmSources(emodnet: WindFarm[], ospar: WindFarm[]): WindFarm[] {
  // Build a lookup of OSPAR farms by normalized key
  const osparByKey = new Map<string, WindFarm>();
  for (const farm of ospar) {
    const key = normalizeMatchKey(farm.name, farm.country);
    osparByKey.set(key, farm);
  }

  const matchedOsparKeys = new Set<string>();

  // Enrich EMODnet records with OSPAR metadata
  const merged = emodnet.map((farm) => {
    const key = normalizeMatchKey(farm.name, farm.country);
    const osparMatch = osparByKey.get(key);

    if (osparMatch) {
      matchedOsparKeys.add(key);
      return {
        ...farm,
        source: 'merged' as WindFarmSource,
        // Enrich with OSPAR metadata (prefer non-null values)
        operator: osparMatch.operator ?? farm.operator,
        developer: osparMatch.operator ?? farm.developer,
        foundation: osparMatch.foundation ?? farm.foundation,
        waterDepth: osparMatch.waterDepth ?? farm.waterDepth,
        hasEIA: osparMatch.hasEIA ?? farm.hasEIA,
        deviceType: osparMatch.deviceType ?? farm.deviceType,
        // Use OSPAR distance if EMODnet is null (OSPAR is in km, more user-friendly)
        distanceToCoast: farm.distanceToCoast ?? osparMatch.distanceToCoast,
        // Prefer higher capacity value (data may differ between sources)
        capacity: Math.max(farm.capacity ?? 0, osparMatch.capacity ?? 0) || farm.capacity,
        numberOfTurbines: farm.numberOfTurbines ?? osparMatch.numberOfTurbines,
      };
    }

    return farm;
  });

  // Add OSPAR-only records (not matched to EMODnet)
  for (const [key, farm] of osparByKey) {
    if (!matchedOsparKeys.has(key)) {
      merged.push(farm);
    }
  }

  return merged;
}

/**
 * Generate a normalized key for fuzzy matching between EMODnet and OSPAR.
 */
function normalizeMatchKey(name: string, country: string): string {
  return `${country.toLowerCase().trim()}::${name.toLowerCase().trim().replace(/\s+/g, ' ')}`;
}

/**
 * Fetch wind farms within a bounding box (EMODnet only for spatial queries).
 */
export async function fetchWindFarmsInBounds(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): Promise<WindFarm[]> {
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: EMODNET_LAYER,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox,
  });

  const url = `${EMODNET_WFS_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error(`EMODnet WFS bbox request failed: ${response.status}`);
  }

  const data: EMODnetWindFarmResponse = await response.json();

  return data.features
    .filter((f) => f.geometry !== null)
    .map(transformEMODnetFeature);
}

// --- Transform functions ---

/**
 * Transform a raw EMODnet GeoJSON feature into our normalized WindFarm type.
 */
function transformEMODnetFeature(feature: EMODnetWindFarmFeature): WindFarm {
  const props = feature.properties;
  const centroid = computeCentroid(feature.geometry);
  const yearNum = props.year ? parseInt(props.year, 10) : null;

  return {
    id: feature.id || `emodnet-${props.name || 'unknown'}`,
    name: props.name || 'Unnamed Wind Farm',
    country: props.country || 'Unknown',
    status: normalizeStatus(props.status),
    capacity: props.power_mw ?? null,
    numberOfTurbines: props.n_turbines ?? null,
    yearCommissioned: yearNum && !isNaN(yearNum) ? yearNum : null,
    developer: null,
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates,
    },
    centroid,
    source: 'emodnet',
    // EMODnet does not provide these; will be enriched by OSPAR merge
    operator: null,
    foundation: null,
    waterDepth: null,
    hasEIA: null,
    distanceToCoast: props.dist_coast != null ? props.dist_coast / 1000 : null, // Convert meters to km
    areaSqKm: props.area_sqkm ?? null,
    deviceType: 'wind turbine', // EMODnet layer is wind-only
  };
}

/**
 * Transform a raw OSPAR GeoJSON feature into our normalized WindFarm type.
 */
function transformOSPARFeature(feature: OSPARWindFarmFeature): WindFarm {
  const props = feature.properties;
  const centroid = computeCentroid(feature.geometry);

  return {
    id: feature.id || `ospar-${props.ID || props.Name || 'unknown'}`,
    name: props.Name || 'Unnamed Installation',
    country: props.Country || 'Unknown',
    status: normalizeStatus(props.Current_St),
    capacity: props.Capacity ?? null,
    numberOfTurbines: props.No_of_Devi ?? null,
    yearCommissioned: null, // OSPAR does not provide commissioning year
    developer: props.Operator ?? null,
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates,
    },
    centroid,
    source: 'ospar',
    operator: props.Operator ?? null,
    foundation: props.Foundation ?? null,
    waterDepth: props.Water_dept ?? null,
    hasEIA: props.EIA ? props.EIA.toLowerCase() === 'yes' : null,
    distanceToCoast: props.Distance_t ?? null, // Already in km
    areaSqKm: null, // OSPAR does not provide area
    deviceType: props.Device_Typ ?? null,
  };
}

/**
 * Normalize free-text status values from EMODnet to our typed enum.
 */
function normalizeStatus(raw: string | null | undefined): WindFarmStatus {
  if (!raw) return 'Unknown';

  const lower = raw.toLowerCase().trim();

  if (lower.includes('production') || lower.includes('operational') || lower.includes('commissioned')) {
    return 'Production';
  }
  if (lower.includes('under construction') || lower.includes('construction')) {
    return 'Under Construction';
  }
  if (lower.includes('authorised') || lower.includes('authorized') || lower.includes('approved') || lower.includes('consented')) {
    return 'Authorised';
  }
  if (lower.includes('pre-construction') || lower.includes('pre construction')) {
    return 'Pre-Construction';
  }
  if (lower.includes('planned')) {
    return 'Planned';
  }
  if (lower.includes('concept') || lower.includes('early planning') || lower.includes('early')) {
    return 'Concept/Early Planning';
  }
  if (lower.includes('decommission')) {
    return 'Decommissioned';
  }

  return 'Unknown';
}

/**
 * Compute the centroid of a GeoJSON Polygon or MultiPolygon geometry.
 * Returns [lng, lat] for MapLibre.
 */
function computeCentroid(
  geometry: { type: string; coordinates: number[][][] | number[][][][] }
): [number, number] {
  let totalLng = 0;
  let totalLat = 0;
  let count = 0;

  function processRing(ring: number[][]) {
    for (const coord of ring) {
      totalLng += coord[0];
      totalLat += coord[1];
      count++;
    }
  }

  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    if (coords.length > 0) {
      processRing(coords[0]); // outer ring only
    }
  } else if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    for (const polygon of coords) {
      if (polygon.length > 0) {
        processRing(polygon[0]); // outer ring of each polygon
      }
    }
  }

  if (count === 0) return [0, 0];
  return [totalLng / count, totalLat / count];
}

/**
 * Convert WindFarm array to a GeoJSON FeatureCollection for map rendering.
 */
export function windFarmsToGeoJSON(windFarms: WindFarm[]) {
  return {
    type: 'FeatureCollection' as const,
    features: windFarms.map((farm) => ({
      type: 'Feature' as const,
      properties: {
        id: farm.id,
        name: farm.name,
        country: farm.country,
        status: farm.status,
        capacity: farm.capacity,
        numberOfTurbines: farm.numberOfTurbines,
        yearCommissioned: farm.yearCommissioned,
        developer: farm.developer,
        source: farm.source,
        operator: farm.operator,
        foundation: farm.foundation,
        deviceType: farm.deviceType,
      },
      geometry: {
        type: farm.geometry.type as 'Polygon' | 'MultiPolygon',
        coordinates: farm.geometry.coordinates,
      },
    })),
  };
}

/**
 * Detect spatial conflicts between wind farms and MPAs.
 *
 * Uses bounding box overlap as a fast approximation. For the prototype,
 * this identifies wind farms whose bounding box intersects an MPA boundary.
 * A production implementation would use proper polygon intersection (e.g., Turf.js).
 */
export function detectConflicts(
  windFarms: WindFarm[],
  mpas: MPA[]
): WindFarmMPAConflict[] {
  const conflicts: WindFarmMPAConflict[] = [];

  for (const farm of windFarms) {
    const farmBbox = computeBbox(farm.geometry);
    if (!farmBbox) continue;

    for (const mpa of mpas) {
      const mpaBbox = mpa.geometry
        ? computeBbox(mpa.geometry)
        : mpaBoundsToBox(mpa.bounds);

      if (!mpaBbox) continue;

      if (bboxOverlaps(farmBbox, mpaBbox)) {
        conflicts.push({
          windFarmId: farm.id,
          windFarmName: farm.name,
          windFarmStatus: farm.status,
          windFarmCapacity: farm.capacity,
          mpaId: mpa.id,
          mpaName: mpa.name,
          mpaHealthScore: mpa.healthScore,
          mpaProtectionLevel: mpa.protectionLevel,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Generate summary statistics for a set of wind farms.
 */
export function computeWindFarmSummary(
  windFarms: WindFarm[],
  conflicts: WindFarmMPAConflict[]
): WindFarmSummary {
  const byStatus: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  let totalCapacity = 0;

  for (const farm of windFarms) {
    byStatus[farm.status] = (byStatus[farm.status] || 0) + 1;
    byCountry[farm.country] = (byCountry[farm.country] || 0) + 1;
    if (farm.capacity) totalCapacity += farm.capacity;
  }

  // Count unique MPAs in conflict
  const uniqueMPAConflicts = new Set(conflicts.map((c) => c.mpaId)).size;

  return {
    totalFarms: windFarms.length,
    totalCapacityMW: totalCapacity,
    byStatus: byStatus as Record<WindFarmStatus, number>,
    byCountry,
    conflictsWithMPAs: uniqueMPAConflicts,
  };
}

// --- Geometry helpers ---

type Bbox = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

function computeBbox(
  geometry: { type: string; coordinates: number[][][] | number[][][][] }
): Bbox | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let found = false;

  function processCoord(coord: number[]) {
    minLng = Math.min(minLng, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLng = Math.max(maxLng, coord[0]);
    maxLat = Math.max(maxLat, coord[1]);
    found = true;
  }

  function processRing(ring: number[][]) {
    for (const coord of ring) processCoord(coord);
  }

  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates as number[][][];
    for (const ring of coords) processRing(ring);
  } else if (geometry.type === 'MultiPolygon') {
    const coords = geometry.coordinates as number[][][][];
    for (const polygon of coords) {
      for (const ring of polygon) processRing(ring);
    }
  }

  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

function mpaBoundsToBox(bounds: number[][]): Bbox | null {
  if (!bounds || bounds.length !== 2) return null;
  const [[lat1, lng1], [lat2, lng2]] = bounds;
  return [
    Math.min(lng1, lng2),
    Math.min(lat1, lat2),
    Math.max(lng1, lng2),
    Math.max(lat1, lat2),
  ];
}

function bboxOverlaps(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
