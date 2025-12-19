/**
 * Indicator Species Data Management
 * Utilities for managing indicator species data with IndexedDB
 */

import { initDB } from './offline-storage';
import { INDICATOR_SPECIES, getSpeciesByEcosystem, findByObisTaxonId } from '@/data/indicator-species';
import { EcosystemType } from '@/types/indicator-species';
import type {
  IndicatorSpecies,
  SpeciesCategory,
  IndicatorSpeciesFilter,
  IndicatorSpeciesCache,
  SpeciesPresence,
  IndicatorHealthScore,
  CategoryHealthScore,
} from '@/types/indicator-species';

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Initialize and populate the indicator species store
 * Should be called on app startup
 */
export async function initIndicatorSpeciesStore(): Promise<void> {
  const db = await initDB();

  // Check if store is already populated
  const count = await db.count('indicator-species');
  if (count > 0) {
    return;
  }

  // Populate with seed data
  await populateIndicatorSpecies();
}

/**
 * Populate IndexedDB with indicator species data
 */
export async function populateIndicatorSpecies(): Promise<void> {
  const db = await initDB();

  const tx = db.transaction('indicator-species', 'readwrite');

  for (const species of INDICATOR_SPECIES) {
    await tx.store.put(species);
  }

  await tx.done;
}

/**
 * Get all indicator species
 */
export async function getAllIndicatorSpecies(): Promise<IndicatorSpecies[]> {
  const db = await initDB();
  return await db.getAll('indicator-species');
}

/**
 * Get indicator species by ID
 */
export async function getIndicatorSpeciesById(id: string): Promise<IndicatorSpecies | undefined> {
  const db = await initDB();
  return await db.get('indicator-species', id);
}

/**
 * Get indicator species by category
 */
export async function getIndicatorSpeciesByCategory(
  categories: SpeciesCategory[]
): Promise<IndicatorSpecies[]> {
  const db = await initDB();
  const all = await db.getAll('indicator-species');

  return all.filter(species => categories.includes(species.category));
}

/**
 * Get indicator species by ecosystem type
 * Returns species relevant to the given ecosystem(s)
 */
export async function getIndicatorSpeciesByEcosystem(
  ecosystems: EcosystemType[]
): Promise<IndicatorSpecies[]> {
  let all: IndicatorSpecies[];

  try {
    const db = await initDB();
    all = await db.getAll('indicator-species');

    // If IndexedDB is empty, use seed data directly
    if (all.length === 0) {
      all = INDICATOR_SPECIES;
    }
  } catch (error) {
    // Fallback to seed data if IndexedDB fails
    console.warn('[Indicator Species] Using seed data fallback:', error);
    all = INDICATOR_SPECIES;
  }

  return all.filter(species =>
    species.ecosystems.some(eco => ecosystems.includes(eco))
  );
}

/**
 * Get indicator species within a geographic region
 */
export async function getIndicatorSpeciesInRegion(
  bounds: { north: number; south: number; east: number; west: number }
): Promise<IndicatorSpecies[]> {
  const db = await initDB();
  const all = await db.getAll('indicator-species');

  return all.filter(species => {
    const gb = species.geographicBounds;
    // Check if species range overlaps with query bounds
    return !(
      gb.south > bounds.north ||
      gb.north < bounds.south ||
      gb.west > bounds.east ||
      gb.east < bounds.west
    );
  });
}

/**
 * Search indicator species by name (common or scientific)
 */
export async function searchIndicatorSpecies(query: string): Promise<IndicatorSpecies[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const db = await initDB();
  const all = await db.getAll('indicator-species');
  const lowerQuery = query.toLowerCase();

  return all.filter(species =>
    species.commonName.toLowerCase().includes(lowerQuery) ||
    species.scientificName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter indicator species by multiple criteria
 */
export async function filterIndicatorSpecies(
  filter: IndicatorSpeciesFilter
): Promise<IndicatorSpecies[]> {
  const db = await initDB();
  let results = await db.getAll('indicator-species');

  // Filter by categories
  if (filter.categories && filter.categories.length > 0) {
    results = results.filter(s => filter.categories!.includes(s.category));
  }

  // Filter by ecosystems
  if (filter.ecosystems && filter.ecosystems.length > 0) {
    results = results.filter(s =>
      s.ecosystems.some(eco => filter.ecosystems!.includes(eco))
    );
  }

  // Filter by conservation status
  if (filter.conservationStatus && filter.conservationStatus.length > 0) {
    results = results.filter(s => filter.conservationStatus!.includes(s.conservationStatus));
  }

  // Filter by search query
  if (filter.searchQuery && filter.searchQuery.length >= 2) {
    const lowerQuery = filter.searchQuery.toLowerCase();
    results = results.filter(s =>
      s.commonName.toLowerCase().includes(lowerQuery) ||
      s.scientificName.toLowerCase().includes(lowerQuery)
    );
  }

  return results;
}

/**
 * Get OBIS taxon IDs for indicator species
 * Filtered by ecosystem type for MPA-specific queries
 */
export async function getIndicatorTaxonIds(
  ecosystems?: EcosystemType[]
): Promise<number[]> {
  let species: IndicatorSpecies[];

  if (ecosystems && ecosystems.length > 0) {
    species = await getIndicatorSpeciesByEcosystem(ecosystems);
  } else {
    species = await getAllIndicatorSpecies();
  }

  return species.map(s => s.obisTaxonId);
}

/**
 * Get cached indicator species data for an MPA
 */
export async function getCachedIndicatorData(
  mpaId: string
): Promise<IndicatorSpeciesCache | null> {
  try {
    const db = await initDB();
    const cached = await db.get('indicator-cache', mpaId);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      await db.delete('indicator-cache', mpaId);
      return null;
    }

    return cached;
  } catch (error) {
    console.error('[Indicator Species] Cache read error:', error);
    return null;
  }
}

/**
 * Cache indicator species data for an MPA
 */
export async function cacheIndicatorData(
  mpaId: string,
  speciesPresence: SpeciesPresence[],
  healthScore: IndicatorHealthScore
): Promise<void> {
  try {
    const db = await initDB();
    const cache: IndicatorSpeciesCache = {
      id: mpaId,
      mpaId,
      speciesPresence,
      healthScore,
      lastFetched: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    await db.put('indicator-cache', cache);
  } catch (error) {
    console.error('[Indicator Species] Cache write error:', error);
  }
}

/**
 * Sync indicator species cache - refresh if stale
 */
export async function syncIndicatorSpeciesCache(): Promise<void> {
  const db = await initDB();

  // Check if seed data is up to date
  const stored = await db.getAll('indicator-species');
  const storedIds = new Set(stored.map(s => s.id));
  const seedIds = new Set(INDICATOR_SPECIES.map(s => s.id));

  // Find any new species in seed data
  const newSpecies = INDICATOR_SPECIES.filter(s => !storedIds.has(s.id));
  const removedIds = stored.filter(s => !seedIds.has(s.id)).map(s => s.id);

  if (newSpecies.length > 0 || removedIds.length > 0) {
    const tx = db.transaction('indicator-species', 'readwrite');

    // Add new species
    for (const species of newSpecies) {
      await tx.store.put(species);
    }

    // Remove species no longer in seed data
    for (const id of removedIds) {
      await tx.store.delete(id);
    }

    await tx.done;
  }
}

/**
 * Clear indicator species cache for an MPA
 */
export async function clearIndicatorCache(mpaId: string): Promise<void> {
  const db = await initDB();
  await db.delete('indicator-cache', mpaId);
}

/**
 * Get all indicator species as a map by ID
 */
export async function getIndicatorSpeciesMap(): Promise<Map<string, IndicatorSpecies>> {
  const species = await getAllIndicatorSpecies();
  return new Map(species.map(s => [s.id, s]));
}

/**
 * Get indicator species by OBIS taxon ID
 */
export async function getIndicatorByTaxonId(taxonId: number): Promise<IndicatorSpecies | undefined> {
  const db = await initDB();
  const index = db.transaction('indicator-species').store.index('by-taxon-id');
  return await index.get(taxonId);
}

/**
 * Determine ecosystem type for an MPA based on its characteristics
 */
export function determineEcosystemTypes(mpa: {
  latitude: number;
  name: string;
  description?: string;
}): EcosystemType[] {
  const ecosystems: EcosystemType[] = [];
  const lowerName = mpa.name.toLowerCase();
  const lowerDesc = (mpa.description || '').toLowerCase();
  const text = `${lowerName} ${lowerDesc}`;

  // Determine by keywords in name/description
  if (text.includes('coral') || text.includes('reef') || text.includes('barrier')) {
    ecosystems.push(EcosystemType.CORAL_REEF);
  }
  if (text.includes('kelp') || text.includes('forest')) {
    ecosystems.push(EcosystemType.KELP_FOREST);
  }
  if (text.includes('seagrass') || text.includes('grass') || text.includes('meadow')) {
    ecosystems.push(EcosystemType.SEAGRASS);
  }
  if (text.includes('rocky') || text.includes('rock')) {
    ecosystems.push(EcosystemType.ROCKY_REEF);
  }
  if (text.includes('pelagic') || text.includes('open ocean') || text.includes('offshore')) {
    ecosystems.push(EcosystemType.OPEN_OCEAN);
  }

  // Determine by latitude
  const lat = Math.abs(mpa.latitude);
  if (lat > 60) {
    ecosystems.push(EcosystemType.POLAR);
  } else if (lat > 35) {
    ecosystems.push(EcosystemType.TEMPERATE);
  } else {
    ecosystems.push(EcosystemType.TROPICAL);
  }

  // Default to open ocean if no specific type identified
  if (ecosystems.length === 0) {
    ecosystems.push(EcosystemType.OPEN_OCEAN);
  }

  return [...new Set(ecosystems)]; // Remove duplicates
}

/**
 * Get relevant indicator species for an MPA
 */
export async function getIndicatorSpeciesForMPA(mpa: {
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
}): Promise<IndicatorSpecies[]> {
  // Determine ecosystem types for this MPA
  const ecosystems = determineEcosystemTypes(mpa);

  // Get species relevant to these ecosystems
  const relevantSpecies = await getIndicatorSpeciesByEcosystem(ecosystems);

  // Also filter by geographic bounds
  const bounds = {
    north: mpa.latitude + 10,
    south: mpa.latitude - 10,
    west: mpa.longitude - 10,
    east: mpa.longitude + 10,
  };

  return relevantSpecies.filter(species => {
    const gb = species.geographicBounds;
    return !(
      gb.south > bounds.north ||
      gb.north < bounds.south ||
      gb.west > bounds.east ||
      gb.east < bounds.west
    );
  });
}
