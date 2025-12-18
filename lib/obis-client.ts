/**
 * OBIS (Ocean Biodiversity Information System) API Client
 * https://api.obis.org/
 *
 * Free and open access to marine biodiversity data
 */

export interface OBISSpecies {
  id: number;
  scientificName: string;
  acceptedNameUsage?: string;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  vernacularName?: string;
  taxonRank?: string;
  records?: number;
}

export interface OBISOccurrence {
  id: string;
  scientificName: string;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate?: string;
  depth?: number;
  locality?: string;
  habitat?: string;
  occurrenceStatus?: string;
  individualCount?: number;
  basisOfRecord?: string;
}

export interface OBISSearchParams {
  scientificname?: string;
  geometry?: string; // WKT format
  startdate?: string;
  enddate?: string;
  startdepth?: number;
  enddepth?: number;
  offset?: number;
  limit?: number;
}

const OBIS_API_BASE = 'https://api.obis.org/v3';
const REQUEST_DELAY = 1000; // 1 second between requests (rate limiting)

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
 * Search for species by name or area
 */
export async function searchSpecies(
  params: OBISSearchParams
): Promise<OBISSpecies[]> {
  await rateLimit();

  const queryParams = new URLSearchParams();

  if (params.scientificname) queryParams.append('scientificname', params.scientificname);
  if (params.geometry) queryParams.append('geometry', params.geometry);
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.limit) queryParams.append('size', params.limit.toString());

  try {
    const response = await fetch(
      `${OBIS_API_BASE}/taxon?${queryParams.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OBIS API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching species from OBIS:', error);
    return [];
  }
}

/**
 * Get occurrences (sightings) for a species in a specific area
 */
export async function getSpeciesOccurrences(
  scientificName: string,
  geometry?: string,
  limit: number = 100
): Promise<OBISOccurrence[]> {
  await rateLimit();

  const queryParams = new URLSearchParams({
    scientificname: scientificName,
    size: limit.toString(),
  });

  if (geometry) {
    queryParams.append('geometry', geometry);
  }

  try {
    const response = await fetch(
      `${OBIS_API_BASE}/occurrence?${queryParams.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OBIS API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching occurrences from OBIS:', error);
    return [];
  }
}

/**
 * Get species in an MPA (using bounding box)
 */
export async function getSpeciesInArea(
  bounds: { north: number; south: number; east: number; west: number },
  limit: number = 50
): Promise<OBISSpecies[]> {
  // Create WKT POLYGON from bounds
  const wkt = `POLYGON((${bounds.west} ${bounds.south}, ${bounds.east} ${bounds.south}, ${bounds.east} ${bounds.north}, ${bounds.west} ${bounds.north}, ${bounds.west} ${bounds.south}))`;

  return searchSpecies({
    geometry: wkt,
    limit,
  });
}

/**
 * Get detailed information about a species
 */
export async function getSpeciesDetails(
  scientificName: string
): Promise<OBISSpecies | null> {
  await rateLimit();

  try {
    const response = await fetch(
      `${OBIS_API_BASE}/taxon/${encodeURIComponent(scientificName)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.results?.[0] || null;
  } catch (error) {
    console.error('Error fetching species details from OBIS:', error);
    return null;
  }
}

/**
 * Create WKT point geometry for location
 */
export function createPointGeometry(lat: number, lng: number): string {
  return `POINT(${lng} ${lat})`;
}

/**
 * Create WKT polygon geometry for bounding box
 */
export function createBoundingBox(
  center: [number, number],
  radiusKm: number
): { north: number; south: number; east: number; west: number } {
  const [lat, lng] = center;

  // Approximate degrees per km (at equator)
  const latDegPerKm = 1 / 111;
  const lngDegPerKm = 1 / (111 * Math.cos(lat * Math.PI / 180));

  return {
    north: lat + (radiusKm * latDegPerKm),
    south: lat - (radiusKm * latDegPerKm),
    east: lng + (radiusKm * lngDegPerKm),
    west: lng - (radiusKm * lngDegPerKm),
  };
}

/**
 * Get common name from vernacular names
 */
export function getCommonName(species: OBISSpecies): string {
  return species.vernacularName || species.scientificName;
}

/**
 * Format taxonomy string
 */
export function formatTaxonomy(species: OBISSpecies): string {
  const parts = [];

  if (species.kingdom) parts.push(species.kingdom);
  if (species.phylum) parts.push(species.phylum);
  if (species.class) parts.push(species.class);
  if (species.order) parts.push(species.order);
  if (species.family) parts.push(species.family);

  return parts.join(' → ');
}
