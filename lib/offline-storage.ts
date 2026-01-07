import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MPA, Species, Observation, UserHealthAssessment } from '@/types';
import type { AbundanceCache, AbundanceRecord } from '@/types/obis-abundance';
import type { EnvironmentalCache } from '@/types/obis-environmental';
import type { TrackingCache } from '@/types/obis-tracking';
import type { IndicatorSpecies, IndicatorSpeciesCache } from '@/types/indicator-species';

/**
 * IndexedDB Schema for Ocean PULSE
 * Stores MPAs, species data, and user observations for offline access
 */
export interface OceanPulseDB extends DBSchema {
  'mpas': {
    key: string;
    value: MPA & {
      lastUpdated: number;
      cached: boolean;
    };
    indexes: { 'by-last-updated': 'lastUpdated' };
  };
  'species-data': {
    key: string;
    value: {
      id: string;
      data: any;
      lastUpdated: number;
      cached: boolean;
    };
    indexes: { 'by-last-updated': 'lastUpdated' };
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
  'abundance-cache': {
    key: string; // mpaId
    value: AbundanceCache;
    indexes: { 'by-last-fetched': 'lastFetched' };
  };
  'abundance-records': {
    key: string; // composite: `${mpaId}:${speciesName}:${date}`
    value: AbundanceRecord;
    indexes: {
      'by-mpa': 'mpaId';
      'by-species': 'scientificName';
      'by-date': 'date';
    };
  };
  'environmental-cache': {
    key: string; // mpaId
    value: EnvironmentalCache;
    indexes: { 'by-last-fetched': 'lastFetched' };
  };
  'tracking-cache': {
    key: string; // mpaId
    value: TrackingCache;
    indexes: { 'by-last-fetched': 'lastFetched' };
  };
  'indicator-species': {
    key: string; // species id
    value: IndicatorSpecies;
    indexes: {
      'by-category': 'category';
      'by-scientific-name': 'scientificName';
      'by-taxon-id': 'obisTaxonId';
    };
  };
  'indicator-cache': {
    key: string; // mpaId
    value: IndicatorSpeciesCache;
    indexes: { 'by-last-fetched': 'lastFetched' };
  };
  'observation-drafts': {
    key: number;
    value: Observation & {
      id: number;
    };
    indexes: {
      'by-mpa': 'mpaId';
      'by-timestamp': 'timestamp';
    };
  };
  'user-health-assessments': {
    key: number;
    value: UserHealthAssessment & {
      id: number;
    };
    indexes: {
      'by-mpa': 'mpaId';
      'by-user': 'userId';
      'by-sync-status': 'synced';
    };
  };
}

const DB_NAME = 'ocean-pulse-db';
const DB_VERSION = 6;

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

      // Species data store (updated schema in v2)
      if (!db.objectStoreNames.contains('species-data')) {
        const speciesStore = db.createObjectStore('species-data', { keyPath: 'id' });
        speciesStore.createIndex('by-last-updated', 'lastUpdated');
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

      // Abundance cache store (added in v2)
      if (!db.objectStoreNames.contains('abundance-cache')) {
        const abundanceCacheStore = db.createObjectStore('abundance-cache', { keyPath: 'id' });
        abundanceCacheStore.createIndex('by-last-fetched', 'lastFetched');
      }

      // Abundance records store (added in v2)
      if (!db.objectStoreNames.contains('abundance-records')) {
        const abundanceRecordsStore = db.createObjectStore('abundance-records', { keyPath: 'id' });
        abundanceRecordsStore.createIndex('by-mpa', 'mpaId');
        abundanceRecordsStore.createIndex('by-species', 'scientificName');
        abundanceRecordsStore.createIndex('by-date', 'date');
      }

      // Environmental cache store (added in v3)
      if (!db.objectStoreNames.contains('environmental-cache')) {
        const environmentalCacheStore = db.createObjectStore('environmental-cache', { keyPath: 'id' });
        environmentalCacheStore.createIndex('by-last-fetched', 'lastFetched');
      }

      // Tracking cache store (added in v4)
      if (!db.objectStoreNames.contains('tracking-cache')) {
        const trackingCacheStore = db.createObjectStore('tracking-cache', { keyPath: 'id' });
        trackingCacheStore.createIndex('by-last-fetched', 'lastFetched');
      }

      // Indicator species store (added in v5)
      if (!db.objectStoreNames.contains('indicator-species')) {
        const indicatorSpeciesStore = db.createObjectStore('indicator-species', { keyPath: 'id' });
        indicatorSpeciesStore.createIndex('by-category', 'category');
        indicatorSpeciesStore.createIndex('by-scientific-name', 'scientificName');
        indicatorSpeciesStore.createIndex('by-taxon-id', 'obisTaxonId');
      }

      // Indicator species cache store (added in v5)
      if (!db.objectStoreNames.contains('indicator-cache')) {
        const indicatorCacheStore = db.createObjectStore('indicator-cache', { keyPath: 'id' });
        indicatorCacheStore.createIndex('by-last-fetched', 'lastFetched');
      }

      // Observation drafts store (added in v6)
      if (!db.objectStoreNames.contains('observation-drafts')) {
        const draftsStore = db.createObjectStore('observation-drafts', {
          keyPath: 'id',
          autoIncrement: true,
        });
        draftsStore.createIndex('by-mpa', 'mpaId');
        draftsStore.createIndex('by-timestamp', 'timestamp');
      }

      // User health assessments store (added in v6)
      if (!db.objectStoreNames.contains('user-health-assessments')) {
        const healthStore = db.createObjectStore('user-health-assessments', {
          keyPath: 'id',
          autoIncrement: true,
        });
        healthStore.createIndex('by-mpa', 'mpaId');
        healthStore.createIndex('by-user', 'userId');
        healthStore.createIndex('by-sync-status', 'synced');
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
    id: `mpa:${mpaId}`,
    data: { species, totalRecords },
    lastUpdated: Date.now(),
    cached: true,
  });
}

/**
 * Get cached species data for an MPA
 */
export async function getCachedSpecies(mpaId: string): Promise<Species[] | null> {
  const db = await initDB();
  const data = await db.get('species-data', `mpa:${mpaId}`);
  return data?.data?.species || null;
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
  return await index.getAll(false as any);
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
  return await index.getAll(mpaId as any);
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

// ==================== OBSERVATION DRAFT OPERATIONS ====================

/**
 * Save an observation draft
 */
export async function saveDraft(observation: Omit<Observation, 'id' | 'synced'>): Promise<number> {
  const db = await initDB();
  return await db.add('observation-drafts', {
    ...observation,
    isDraft: true,
    synced: false,
    timestamp: observation.timestamp || Date.now(),
  } as any);
}

/**
 * Update an existing draft
 */
export async function updateDraft(id: number, observation: Partial<Observation>): Promise<void> {
  const db = await initDB();
  const existing = await db.get('observation-drafts', id);
  if (existing) {
    await db.put('observation-drafts', {
      ...existing,
      ...observation,
      id,
    });
  }
}

/**
 * Get all drafts
 */
export async function getAllDrafts(): Promise<(Observation & { id: number })[]> {
  const db = await initDB();
  return await db.getAll('observation-drafts');
}

/**
 * Get a draft by ID
 */
export async function getDraft(id: number): Promise<(Observation & { id: number }) | undefined> {
  const db = await initDB();
  return await db.get('observation-drafts', id);
}

/**
 * Delete a draft
 */
export async function deleteDraft(id: number): Promise<void> {
  const db = await initDB();
  await db.delete('observation-drafts', id);
}

/**
 * Get drafts count
 */
export async function getDraftsCount(): Promise<number> {
  const db = await initDB();
  return await db.count('observation-drafts');
}

// ==================== USER HEALTH ASSESSMENT OPERATIONS ====================

/**
 * Save a user health assessment
 */
export async function saveHealthAssessment(
  assessment: Omit<UserHealthAssessment, 'id' | 'synced'>
): Promise<number> {
  const db = await initDB();
  return await db.add('user-health-assessments', {
    ...assessment,
    timestamp: assessment.timestamp || Date.now(),
    synced: false,
  } as any);
}

/**
 * Get health assessments for an MPA
 */
export async function getHealthAssessmentsForMPA(mpaId: string): Promise<(UserHealthAssessment & { id: number })[]> {
  const db = await initDB();
  const index = db.transaction('user-health-assessments').store.index('by-mpa');
  return await index.getAll(mpaId as any);
}

/**
 * Get unsynced health assessments
 */
export async function getUnsyncedHealthAssessments(): Promise<(UserHealthAssessment & { id: number })[]> {
  const db = await initDB();
  const index = db.transaction('user-health-assessments').store.index('by-sync-status');
  return await index.getAll(false as any);
}

/**
 * Mark a health assessment as synced
 */
export async function markHealthAssessmentSynced(id: number): Promise<void> {
  const db = await initDB();
  const assessment = await db.get('user-health-assessments', id);
  if (assessment) {
    assessment.synced = true;
    await db.put('user-health-assessments', assessment);
  }
}

/**
 * Calculate average user health score for an MPA
 * Returns the average score and count of assessments
 */
export async function getUserHealthScoreForMPA(mpaId: string): Promise<{
  averageScore: number | null;
  count: number;
  recentAssessments: UserHealthAssessment[];
}> {
  const assessments = await getHealthAssessmentsForMPA(mpaId);

  if (assessments.length === 0) {
    return { averageScore: null, count: 0, recentAssessments: [] };
  }

  // Calculate average
  const totalScore = assessments.reduce((sum, a) => sum + a.score, 0);
  const averageScore = totalScore / assessments.length;

  // Get 5 most recent
  const recentAssessments = assessments
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  return {
    averageScore,
    count: assessments.length,
    recentAssessments,
  };
}
