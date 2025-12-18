import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MPA, Species, Observation } from '@/types';

/**
 * IndexedDB Schema for Ocean PULSE
 * Stores MPAs, species data, and user observations for offline access
 */
interface OceanPulseDB extends DBSchema {
  'mpas': {
    key: string;
    value: MPA & {
      lastUpdated: number;
      cached: boolean;
    };
    indexes: { 'by-last-updated': 'lastUpdated' };
  };
  'species-data': {
    key: string; // mpaId
    value: {
      mpaId: string;
      species: Species[];
      totalRecords: number;
      lastUpdated: number;
    };
    indexes: { 'by-mpa': 'mpaId' };
  };
  'observations': {
    key: number;
    value: Observation & {
      id: number;
    };
    indexes: {
      'by-sync-status': 'synced';
      'by-mpa': 'mpaId';
    };
  };
  'settings': {
    key: string;
    value: {
      key: string;
      value: any;
      lastUpdated: number;
    };
  };
}

const DB_NAME = 'ocean-pulse-db';
const DB_VERSION = 1;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<OceanPulseDB>> {
  return openDB<OceanPulseDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // MPA data store
      if (!db.objectStoreNames.contains('mpas')) {
        const mpaStore = db.createObjectStore('mpas', { keyPath: 'id' });
        mpaStore.createIndex('by-last-updated', 'lastUpdated');
      }

      // Species data store
      if (!db.objectStoreNames.contains('species-data')) {
        const speciesStore = db.createObjectStore('species-data', { keyPath: 'mpaId' });
        speciesStore.createIndex('by-mpa', 'mpaId');
      }

      // User observations store
      if (!db.objectStoreNames.contains('observations')) {
        const obsStore = db.createObjectStore('observations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        obsStore.createIndex('by-sync-status', 'synced');
        obsStore.createIndex('by-mpa', 'mpaId');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
}

// ==================== MPA OPERATIONS ====================

/**
 * Cache an MPA for offline use
 */
export async function cacheMPA(mpa: MPA): Promise<void> {
  const db = await initDB();
  await db.put('mpas', {
    ...mpa,
    lastUpdated: Date.now(),
    cached: true,
  });
}

/**
 * Get a cached MPA by ID
 */
export async function getCachedMPA(mpaId: string): Promise<MPA | null> {
  const db = await initDB();
  const cached = await db.get('mpas', mpaId);
  return cached || null;
}

/**
 * Get all cached MPAs
 */
export async function getAllCachedMPAs(): Promise<MPA[]> {
  const db = await initDB();
  const mpas = await db.getAll('mpas');
  return mpas.map((mpa) => {
    const { lastUpdated, cached, ...mpaData } = mpa;
    return mpaData as MPA;
  });
}

/**
 * Check if an MPA is cached
 */
export async function isMPACached(mpaId: string): Promise<boolean> {
  const db = await initDB();
  const mpa = await db.get('mpas', mpaId);
  return mpa?.cached || false;
}

/**
 * Delete a cached MPA
 */
export async function deleteCachedMPA(mpaId: string): Promise<void> {
  const db = await initDB();
  await db.delete('mpas', mpaId);
}

/**
 * Get cached MPAs count
 */
export async function getCachedMPACount(): Promise<number> {
  const db = await initDB();
  return await db.count('mpas');
}

// ==================== SPECIES OPERATIONS ====================

/**
 * Cache species data for an MPA
 */
export async function cacheSpeciesData(
  mpaId: string,
  species: Species[],
  totalRecords: number
): Promise<void> {
  const db = await initDB();
  await db.put('species-data', {
    mpaId,
    species,
    totalRecords,
    lastUpdated: Date.now(),
  });
}

/**
 * Get cached species data for an MPA
 */
export async function getCachedSpecies(mpaId: string): Promise<Species[] | null> {
  const db = await initDB();
  const data = await db.get('species-data', mpaId);
  return data?.species || null;
}

// ==================== OBSERVATION OPERATIONS ====================

/**
 * Save an observation (for later sync)
 */
export async function saveObservation(observation: Omit<Observation, 'id'>): Promise<number> {
  const db = await initDB();
  return await db.add('observations', {
    ...observation,
    timestamp: Date.now(),
    synced: false,
  } as any);
}

/**
 * Get all unsynced observations
 */
export async function getUnsyncedObservations(): Promise<(Observation & { id: number })[]> {
  const db = await initDB();
  const index = db.transaction('observations').store.index('by-sync-status');
  return await index.getAll(false);
}

/**
 * Mark an observation as synced
 */
export async function markObservationSynced(id: number): Promise<void> {
  const db = await initDB();
  const observation = await db.get('observations', id);
  if (observation) {
    observation.synced = true;
    await db.put('observations', observation);
  }
}

/**
 * Get observations for a specific MPA
 */
export async function getObservationsForMPA(mpaId: string): Promise<(Observation & { id: number })[]> {
  const db = await initDB();
  const index = db.transaction('observations').store.index('by-mpa');
  return await index.getAll(mpaId);
}

/**
 * Get total observation count
 */
export async function getObservationCount(): Promise<number> {
  const db = await initDB();
  return await db.count('observations');
}

// ==================== SETTINGS OPERATIONS ====================

/**
 * Save a setting
 */
export async function saveSetting(key: string, value: any): Promise<void> {
  const db = await initDB();
  await db.put('settings', {
    key,
    value,
    lastUpdated: Date.now(),
  });
}

/**
 * Get a setting
 */
export async function getSetting<T = any>(key: string): Promise<T | null> {
  const db = await initDB();
  const setting = await db.get('settings', key);
  return setting?.value || null;
}

// ==================== STORAGE MANAGEMENT ====================

/**
 * Get storage quota information
 */
export async function getStorageInfo(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentUsed,
    };
  }

  return {
    usage: 0,
    quota: 0,
    percentUsed: 0,
  };
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const db = await initDB();
  await db.clear('mpas');
  await db.clear('species-data');
  // Don't clear observations as they contain user data
}

/**
 * Clear old cached data (older than N days)
 */
export async function clearOldCache(daysOld: number = 30): Promise<number> {
  const db = await initDB();
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  const mpas = await db.getAll('mpas');
  let deletedCount = 0;

  for (const mpa of mpas) {
    if (mpa.lastUpdated < cutoffTime) {
      await db.delete('mpas', mpa.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
