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

// Common name to scientific name mappings for popular marine species
const COMMON_NAME_MAPPINGS: Record<string, string[]> = {
  'dolphin': ['Tursiops', 'Delphinus', 'Stenella', 'Orcinus'],
  'whale': ['Megaptera', 'Balaenoptera', 'Physeter', 'Eubalaena'],
  'shark': ['Carcharodon', 'Galeocerdo', 'Sphyrna', 'Rhincodon'],
  'turtle': ['Caretta', 'Chelonia', 'Eretmochelys', 'Lepidochelys'],
  'seal': ['Phoca', 'Halichoerus', 'Mirounga'],
  'octopus': ['Octopus'],
  'squid': ['Loligo', 'Architeuthis', 'Dosidicus'],
  'tuna': ['Thunnus'],
  'ray': ['Manta', 'Mobula', 'Myliobatis'],
  'coral': ['Acropora', 'Pocillopora', 'Porites'],
  'jellyfish': ['Aurelia', 'Chrysaora', 'Pelagia'],
  'crab': ['Cancer', 'Callinectes', 'Portunus'],
  'lobster': ['Homarus', 'Panulirus'],
  'clam': ['Mercenaria', 'Mya', 'Spisula'],
  'oyster': ['Crassostrea', 'Ostrea'],
  'starfish': ['Asterias', 'Pisaster'],
  'urchin': ['Strongylocentrotus', 'Echinometra'],
  'seahorse': ['Hippocampus'],
  'eel': ['Anguilla', 'Moray'],
  'bass': ['Dicentrarchus', 'Micropterus'],
};

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
 * Fetch species from the taxon/complete endpoint
 */
async function fetchTaxonComplete(name: string): Promise<OBISSpecies[]> {
  const url = `${OBIS_API_BASE}/taxon/complete/${encodeURIComponent(name)}`;
  console.log('[OBIS] Fetching from:', url);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  console.log('[OBIS] Response status:', response.status);

  if (!response.ok) {
    console.error(`OBIS API error: ${response.status}`);
    return [];
  }

  const data = await response.json();

  // The response is an array directly, not an object with results
  if (!Array.isArray(data)) {
    console.error('[OBIS] Unexpected response format:', typeof data);
    return [];
  }

  // Transform the results to match our interface
  const results = data.map((item: any, index: number) => ({
    id: item.id || item.taxonID || index,
    scientificName: item.scientificName || item.scientificname,
    acceptedNameUsage: item.acceptedNameUsage,
    kingdom: item.kingdom,
    phylum: item.phylum,
    class: item.class,
    order: item.order,
    family: item.family,
    genus: item.genus,
    species: item.species,
    vernacularName: item.vernacularName,
    taxonRank: item.rank || item.taxonRank,
    records: item.records,
  }));

  return results;
}

/**
 * Search for species by name using taxon/complete endpoint
 * Supports both scientific names and common names via mapping
 */
export async function searchSpecies(
  params: OBISSearchParams
): Promise<OBISSpecies[]> {
  await rateLimit();

  // If searching by name, use the taxon/complete endpoint
  if (params.scientificname && !params.geometry) {
    const query = params.scientificname.toLowerCase().trim();
    console.log('[OBIS] Searching for:', query);

    // First, try searching directly with the query
    let allResults: OBISSpecies[] = [];

    try {
      const directResults = await fetchTaxonComplete(params.scientificname);
      allResults = allResults.concat(directResults);
      console.log('[OBIS] Direct search returned:', directResults.length, 'results');
    } catch (error) {
      console.error('[OBIS] Direct search error:', error);
    }

    // If no results and query matches a common name, search for scientific names
    if (allResults.length === 0 && COMMON_NAME_MAPPINGS[query]) {
      console.log('[OBIS] Found common name mapping for:', query);
      const scientificNames = COMMON_NAME_MAPPINGS[query];

      for (const scientificName of scientificNames) {
        try {
          const results = await fetchTaxonComplete(scientificName);
          allResults = allResults.concat(results);
          console.log(`[OBIS] Search for ${scientificName} returned:`, results.length, 'results');
        } catch (error) {
          console.error(`[OBIS] Error searching for ${scientificName}:`, error);
        }
      }
    }

    // Deduplicate results by scientificName
    const uniqueResults = allResults.filter((result, index, self) =>
      index === self.findIndex((r) => r.scientificName === result.scientificName)
    );

    console.log('[OBIS] Total unique results:', uniqueResults.length);
    return uniqueResults.slice(0, params.limit || 20);
  }

  // For geometry-based searches, use getSpeciesInArea instead
  console.log('[OBIS] Geometry-based search not supported in searchSpecies, use getSpeciesInArea instead');
  return [];
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
 * Uses the occurrence endpoint to find species in a geographic area
 */
export async function getSpeciesInArea(
  bounds: { north: number; south: number; east: number; west: number },
  limit: number = 100
): Promise<OBISSpecies[]> {
  await rateLimit();

  // Create WKT POLYGON from bounds
  const wkt = `POLYGON((${bounds.west} ${bounds.south}, ${bounds.east} ${bounds.south}, ${bounds.east} ${bounds.north}, ${bounds.west} ${bounds.north}, ${bounds.west} ${bounds.south}))`;

  console.log('[OBIS] Searching area with bounds:', bounds);
  console.log('[OBIS] WKT:', wkt);

  try {
    const response = await fetch(
      `${OBIS_API_BASE}/occurrence?geometry=${encodeURIComponent(wkt)}&size=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    console.log('[OBIS] Occurrence response status:', response.status);

    if (!response.ok) {
      console.error(`OBIS API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log('[OBIS] Occurrence data:', data);

    // Extract unique species from occurrences
    const occurrences = data.results || [];
    const speciesMap = new Map<string, OBISSpecies>();

    for (const occ of occurrences) {
      const scientificName = occ.scientificName || occ.scientificname;
      if (!scientificName || speciesMap.has(scientificName)) continue;

      // Create species object from occurrence data
      speciesMap.set(scientificName, {
        id: occ.taxonID || occ.aphiaID || speciesMap.size,
        scientificName,
        acceptedNameUsage: occ.acceptedNameUsage,
        kingdom: occ.kingdom,
        phylum: occ.phylum,
        class: occ.class,
        order: occ.order,
        family: occ.family,
        genus: occ.genus,
        species: occ.species,
        vernacularName: occ.vernacularName,
        taxonRank: occ.taxonRank,
        records: 1, // We don't have record counts from occurrences
      });
    }

    const species = Array.from(speciesMap.values());
    console.log('[OBIS] Found', species.length, 'unique species in area');
    return species;
  } catch (error) {
    console.error('Error fetching species in area:', error);
    return [];
  }
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
 * Get common name from vernacular names or fallback mappings
 * Exported from species-common-names.ts
 */
export { getCommonName } from './species-common-names';

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
