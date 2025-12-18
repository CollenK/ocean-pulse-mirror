/**
 * Species Service
 * Manages species data with caching and offline support
 */

import {
  searchSpecies,
  getSpeciesDetails,
  getSpeciesInArea,
  getSpeciesOccurrences,
  createBoundingBox,
  OBISSpecies,
  OBISOccurrence,
} from './obis-client';
import { openDB } from 'idb';
import type { OceanPulseDB } from './offline-storage';

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get or initialize database
 */
async function getDB() {
  return openDB<OceanPulseDB>('ocean-pulse-db', 1);
}

/**
 * Search for species with caching
 * Searches both API and sample data
 */
export async function searchSpeciesCached(
  query: string,
  useCache: boolean = true
): Promise<OBISSpecies[]> {
  if (!query || query.length < 2) {
    console.log('[Species Search] Query too short:', query);
    return [];
  }

  console.log('[Species Search] Searching for:', query);

  const cacheKey = `search:${query.toLowerCase()}`;
  const lowerQuery = query.toLowerCase();

  // Try cache first
  if (useCache) {
    try {
      const db = await getDB();
      const cached = await db.get('species-data', cacheKey);

      if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        console.log('[Species Search] Cache hit:', cached.data);
        return cached.data as OBISSpecies[];
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
  }

  try {
    // Fetch from API
    console.log('[Species Search] Fetching from API with query:', query);
    const apiResults = await searchSpecies({
      scientificname: query,
      limit: 20,
    });

    console.log('[Species Search] API returned:', apiResults.length, 'results');

    if (apiResults && apiResults.length > 0) {
      // Cache API results
      try {
        const db = await getDB();
        await db.put('species-data', {
          id: cacheKey,
          data: apiResults,
          lastUpdated: Date.now(),
          cached: true,
        });
        console.log('[Species Search] Results cached');
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return apiResults;
    }

    // No results from API
    console.log('[Species Search] No results from API');
    return [];
  } catch (error) {
    console.error('[Species Search] API error:', error);
    return [];
  }
}

/**
 * Get species for an MPA with caching
 * Uses sample data as fallback when API fails or returns no results
 */
export async function getSpeciesForMPA(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50,
  useCache: boolean = true
): Promise<OBISSpecies[]> {
  const cacheKey = `mpa:${mpaId}`;

  // Try cache first
  if (useCache) {
    try {
      const db = await getDB();
      const cached = await db.get('species-data', cacheKey);

      if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        console.log(`[Species] Cache hit for MPA ${mpaId}`);
        return cached.data as OBISSpecies[];
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
  }

  console.log(`[Species] Fetching from API for MPA ${mpaId}...`);

  try {
    // Fetch from API
    const bounds = createBoundingBox(center, radiusKm);
    const results = await getSpeciesInArea(bounds, 100);

    // If API returns results, cache and return them
    if (results && results.length > 0) {
      console.log(`[Species] API returned ${results.length} species`);

      // Cache results
      try {
        const db = await getDB();
        await db.put('species-data', {
          id: cacheKey,
          data: results,
          lastUpdated: Date.now(),
          cached: true,
        });
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return results;
    }

    // No results from API
    console.log('[Species] No API results found');
    return [];
  } catch (error) {
    // API error
    console.error('[Species] API error:', error);
    return [];
  }
}

/**
 * Get species details with caching
 */
export async function getSpeciesDetailsCached(
  scientificName: string,
  useCache: boolean = true
): Promise<OBISSpecies | null> {
  const cacheKey = `species:${scientificName}`;

  // Try cache first
  if (useCache) {
    try {
      const db = await getDB();
      const cached = await db.get('species-data', cacheKey);

      if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        return cached.data as OBISSpecies;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
  }

  // Fetch from API
  const result = await getSpeciesDetails(scientificName);

  if (result) {
    // Cache result
    try {
      const db = await getDB();
      await db.put('species-data', {
        id: cacheKey,
        data: result,
        lastUpdated: Date.now(),
        cached: true,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  return result;
}

/**
 * Get popular species (most observed)
 * Fetches real species data from OBIS for common marine species
 */
export async function getPopularSpecies(limit: number = 10): Promise<OBISSpecies[]> {
  const cacheKey = 'popular-species';

  // Try cache first
  try {
    const db = await getDB();
    const cached = await db.get('species-data', cacheKey);

    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
      console.log('[Species] Cache hit for popular species');
      return cached.data as OBISSpecies[];
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }

  console.log('[Species] Fetching popular species from API...');

  // List of well-known marine species to search for
  const popularSpeciesNames = [
    'Tursiops truncatus',    // Bottlenose dolphin
    'Caretta caretta',       // Loggerhead sea turtle
    'Chelonia mydas',        // Green sea turtle
    'Megaptera novaeangliae',// Humpback whale
    'Orcinus orca',          // Orca
    'Carcharodon carcharias',// Great white shark
    'Thunnus albacares',     // Yellowfin tuna
    'Manta birostris',       // Giant manta ray
    'Physeter macrocephalus',// Sperm whale
    'Octopus vulgaris',      // Common octopus
  ];

  try {
    // Fetch details for each popular species
    const results: OBISSpecies[] = [];

    for (const name of popularSpeciesNames.slice(0, limit)) {
      try {
        const speciesResults = await searchSpecies({
          scientificname: name,
          limit: 1,
        });

        if (speciesResults && speciesResults.length > 0) {
          results.push(speciesResults[0]);
        }
      } catch (error) {
        console.error(`Error fetching ${name}:`, error);
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (results.length > 0) {
      console.log(`[Species] API returned ${results.length} popular species`);

      // Cache results
      try {
        const db = await getDB();
        await db.put('species-data', {
          id: cacheKey,
          data: results,
          lastUpdated: Date.now(),
          cached: true,
        });
      } catch (error) {
        console.error('Cache write error:', error);
      }

      return results;
    }

    return [];
  } catch (error) {
    console.error('[Species] Error fetching popular species:', error);
    return [];
  }
}

/**
 * Get species occurrences near location
 */
export async function getNearbyOccurrences(
  lat: number,
  lng: number,
  radiusKm: number = 10,
  limit: number = 50
): Promise<OBISOccurrence[]> {
  const bounds = createBoundingBox([lat, lng], radiusKm);
  const wkt = `POLYGON((${bounds.west} ${bounds.south}, ${bounds.east} ${bounds.south}, ${bounds.east} ${bounds.north}, ${bounds.west} ${bounds.north}, ${bounds.west} ${bounds.south}))`;

  try {
    // This would need to be implemented with OBIS occurrence endpoint
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error fetching nearby occurrences:', error);
    return [];
  }
}

/**
 * Clear species cache
 */
export async function clearSpeciesCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('species-data', 'readwrite');
    await tx.store.clear();
    await tx.done;
  } catch (error) {
    console.error('Error clearing species cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getSpeciesCacheStats(): Promise<{
  count: number;
  oldestEntry: number;
  newestEntry: number;
}> {
  try {
    const db = await getDB();
    const all = await db.getAll('species-data');

    if (all.length === 0) {
      return { count: 0, oldestEntry: 0, newestEntry: 0 };
    }

    const timestamps = all.map(item => item.lastUpdated);
    return {
      count: all.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, oldestEntry: 0, newestEntry: 0 };
  }
}

/**
 * Format species name for display
 */
export function formatSpeciesName(species: OBISSpecies): string {
  if (species.vernacularName) {
    return `${species.vernacularName} (${species.scientificName})`;
  }
  return species.scientificName;
}

/**
 * Get conservation status emoji
 */
export function getConservationEmoji(status?: string): string {
  if (!status) return '📊';

  const lower = status.toLowerCase();
  if (lower.includes('endangered')) return '🔴';
  if (lower.includes('vulnerable')) return '🟠';
  if (lower.includes('threatened')) return '🟡';
  if (lower.includes('concern')) return '🟡';
  return '🟢';
}
