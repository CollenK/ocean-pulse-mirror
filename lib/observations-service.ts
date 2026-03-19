/**
 * Observations Service
 * Handles CRUD operations for observations in Supabase
 * Falls back to IndexedDB for offline support
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { captureError } from '@/lib/error-reporting';
import { saveObservation as saveObservationLocal, getObservationsForMPA as getLocalObservations, deleteLocalObservation } from '@/lib/offline-storage';
import type { ReportType } from '@/types';
import type { Json, ObservationRow } from '@/types/supabase';
import type { QualityTier } from '@/types/verification';

export interface CreateObservationInput {
  mpaId: string;
  reportType: ReportType;
  speciesName?: string;
  speciesType?: string;
  quantity?: number;
  notes?: string;
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  photoUrl?: string;
  photoMetadata?: Json;
  healthScoreAssessment?: number;
  userId?: string;
  litterItems?: Json;
  litterWeightKg?: number;
  surveyLengthM?: number;
}

export interface ObservationWithProfile extends ObservationRow {
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  verification_count?: number;
}

/**
 * Build RPC parameters from observation input
 */
function buildRpcParams(input: CreateObservationInput) {
  return {
    p_mpa_id: input.mpaId,
    p_user_id: input.userId || null,
    p_report_type: input.reportType,
    p_species_name: input.speciesName || null,
    p_species_type: input.speciesType || null,
    p_quantity: input.quantity || null,
    p_notes: input.notes || null,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_location_accuracy_m: input.locationAccuracy || null,
    p_photo_url: input.photoUrl || null,
    p_photo_metadata: input.photoMetadata || null,
    p_health_score: input.healthScoreAssessment || null,
    p_litter_items: input.litterItems || null,
    p_litter_weight_kg: input.litterWeightKg || null,
    p_survey_length_m: input.surveyLengthM || null,
  };
}

/**
 * Save observation to IndexedDB as a local fallback
 */
async function saveObservationLocally(input: CreateObservationInput): Promise<{ id: string; synced: boolean }> {
  const localId = await saveObservationLocal({
    mpaId: input.mpaId,
    reportType: input.reportType,
    speciesName: input.speciesName,
    quantity: input.quantity,
    notes: input.notes || '',
    photo: input.photoUrl || '',
    location: { lat: input.latitude, lng: input.longitude },
    timestamp: Date.now(),
    synced: false,
    healthScoreAssessment: input.healthScoreAssessment,
    userId: input.userId,
  });
  return { id: String(localId), synced: false };
}

/**
 * Create a new observation
 * Saves to Supabase if available, falls back to IndexedDB
 */
export async function createObservation(input: CreateObservationInput): Promise<{ id: string; synced: boolean }> {
  if (!isSupabaseConfigured()) {
    return saveObservationLocally(input);
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('create_observation_with_health', buildRpcParams(input));

    if (error) {
      console.error('Supabase RPC error:', error);
      throw error;
    }

    return { id: data as string, synced: true };
  } catch (error) {
    captureError(error, { context: 'createObservation', mpaId: input.mpaId, userId: input.userId ?? '' });
  }

  return saveObservationLocally(input);
}

/**
 * Fetch remote observations from Supabase for an MPA
 */
async function fetchRemoteObservations(mpaId: string): Promise<ObservationWithProfile[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('observations')
      .select(`
        *,
        profiles:user_id (
          display_name,
          avatar_url
        ),
        observation_verifications (count)
      `)
      .eq('mpa_id', mpaId)
      .eq('is_draft', false)
      .order('observed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    if (!data) return [];

    return (data as Array<ObservationWithProfile & {
      observation_verifications?: Array<{ count: number }>;
    }>).map(obs => {
      const count = obs.observation_verifications?.[0]?.count ?? 0;
      const { observation_verifications: _, ...rest } = obs;
      return { ...rest, verification_count: count } as ObservationWithProfile;
    });
  } catch (error) {
    console.error('Failed to fetch from Supabase:', error);
    return [];
  }
}

/**
 * Convert a local (IndexedDB) observation to the Supabase row format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertLocalObservation(local: any): ObservationWithProfile {
  const timestamp = new Date(local.timestamp).toISOString();
  return {
    id: String(local.id),
    user_id: local.userId || null,
    mpa_id: local.mpaId,
    report_type: local.reportType,
    species_name: local.speciesName || null,
    species_type: null,
    quantity: local.quantity || null,
    notes: local.notes || null,
    latitude: local.location.lat,
    longitude: local.location.lng,
    location_accuracy_m: local.location.accuracy || null,
    location_manually_entered: local.location.manuallyEntered || false,
    photo_url: local.photo as string || null,
    photo_metadata: null,
    health_score_assessment: local.healthScoreAssessment || null,
    is_draft: local.isDraft || false,
    synced_at: null,
    observed_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    quality_tier: determineInitialTier(local.photo as string || null, local.location?.lat ?? null, local.speciesName || null),
    community_species_name: null,
    litter_items: null,
    litter_weight_kg: null,
    survey_length_m: null,
    profiles: null,
  };
}

/**
 * Fetch unsynced local observations for an MPA
 */
async function fetchUnsyncedLocalObservations(mpaId: string): Promise<ObservationWithProfile[]> {
  try {
    const localObs = await getLocalObservations(mpaId);
    return localObs.filter(obs => !obs.synced).map(convertLocalObservation);
  } catch (error) {
    console.error('Failed to fetch local observations:', error);
    return [];
  }
}

/**
 * Fetch observations for an MPA
 * Fetches from Supabase if available, includes local unsynced observations
 */
export async function fetchObservationsForMPA(mpaId: string): Promise<ObservationWithProfile[]> {
  const remote = await fetchRemoteObservations(mpaId);
  const local = await fetchUnsyncedLocalObservations(mpaId);

  const observations = [...remote, ...local];
  observations.sort((a, b) =>
    new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()
  );

  return observations;
}

/**
 * Get total observation count for an MPA
 */
export async function getObservationCountForMPA(mpaId: string): Promise<number> {
  let count = 0;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { count: supabaseCount, error } = await supabase
        .from('observations')
        .select('*', { count: 'exact', head: true })
        .eq('mpa_id', mpaId)
        .eq('is_draft', false);

      if (!error && supabaseCount !== null) {
        count = supabaseCount;
      }
    } catch (error) {
      console.error('Failed to get Supabase count:', error);
    }
  }

  // Add local unsynced count
  try {
    const localObs = await getLocalObservations(mpaId);
    const unsyncedCount = localObs.filter(obs => !obs.synced).length;
    count += unsyncedCount;
  } catch (error) {
    console.error('Failed to get local count:', error);
  }

  return count;
}

/**
 * Check if a string is a valid UUID format
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export interface UpdateObservationInput {
  id: string;
  userId: string;
  reportType?: ReportType;
  speciesName?: string;
  speciesType?: string;
  quantity?: number;
  notes?: string;
  healthScoreAssessment?: number;
}

/**
 * Update an existing observation
 * Only allows users to update their own observations
 * Note: Local (unsynced) observations cannot be edited
 */
export async function updateObservation(input: UpdateObservationInput): Promise<{ success: boolean; error?: string }> {
  // Check if this is a local observation (numeric ID) - these can't be edited
  if (!isUUID(input.id)) {
    return { success: false, error: 'Local observations cannot be edited. Please wait for sync or delete and recreate.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const supabase = createClient();

    // Build update data (only include fields that are provided)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.reportType !== undefined) updateData.report_type = input.reportType;
    if (input.speciesName !== undefined) updateData.species_name = input.speciesName;
    if (input.speciesType !== undefined) updateData.species_type = input.speciesType;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.healthScoreAssessment !== undefined) updateData.health_score_assessment = input.healthScoreAssessment;

    const { error } = await supabase
      .from('observations')
      .update(updateData)
      .eq('id', input.id)
      .eq('user_id', input.userId); // Ensure user can only update their own observations

    if (error) {
      console.error('Supabase update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    captureError(error, { context: 'updateObservation', observationId: input.id, userId: input.userId });
    return { success: false, error: 'Failed to update observation' };
  }
}

/**
 * Delete an observation
 * Only allows users to delete their own observations
 * Handles both Supabase (UUID) and local (numeric) observation IDs
 */
export async function deleteObservation(observationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // Check if this is a local observation (numeric ID) or Supabase observation (UUID)
  if (!isUUID(observationId)) {
    // Local observation - delete from IndexedDB
    try {
      const numericId = parseInt(observationId, 10);
      if (isNaN(numericId)) {
        return { success: false, error: 'Invalid observation ID' };
      }
      await deleteLocalObservation(numericId);
      return { success: true };
    } catch (error) {
      captureError(error, { context: 'deleteObservation', observationId, action: 'deleteLocal' });
      return { success: false, error: 'Failed to delete local observation' };
    }
  }

  // Supabase observation
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const supabase = createClient();

    // Health assessments cascade-delete via FK constraint
    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', observationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    captureError(error, { context: 'deleteObservation', observationId, userId, action: 'deleteSupabase' });
    return { success: false, error: 'Failed to delete observation' };
  }
}

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Decode a base64 data URI into a Uint8Array
 */
function decodeBase64ToBytes(photoBase64: string): Uint8Array {
  const base64Data = photoBase64.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Uint8Array(byteNumbers);
}

/**
 * Detect image format from magic bytes.
 * Returns content type and extension, or null if unsupported.
 */
function detectImageFormat(bytes: Uint8Array): { contentType: string; extension: string } | null {
  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

  if (isJPEG) return { contentType: 'image/jpeg', extension: 'jpg' };
  if (isPNG) return { contentType: 'image/png', extension: 'png' };
  return null;
}

/**
 * Upload photo to Supabase Storage
 * Returns the public URL of the uploaded photo
 */
export async function uploadObservationPhoto(
  photoBase64: string,
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured() || !isUUID(userId)) {
    if (!isUUID(userId)) console.error('Invalid userId format for photo upload');
    return null;
  }

  try {
    const byteArray = decodeBase64ToBytes(photoBase64);

    if (byteArray.length > MAX_PHOTO_SIZE) {
      console.error('Photo exceeds maximum file size of 5MB');
      return null;
    }

    const format = detectImageFormat(byteArray);
    if (!format) {
      console.error('Invalid image format. Only JPEG and PNG are supported.');
      return null;
    }

    const supabase = createClient();
    const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: format.contentType });
    const filename = `${userId}/${Date.now()}.${format.extension}`;

    const { data, error } = await supabase.storage
      .from('observation-photos')
      .upload(filename, blob, { contentType: format.contentType, upsert: false });

    if (error) {
      captureError(error, { context: 'uploadObservationPhoto', userId, action: 'storageUpload' });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('observation-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    captureError(error, { context: 'uploadObservationPhoto', userId });
    return null;
  }
}

export interface UserObservationStats {
  observationCount: number;
  speciesCount: number;
  healthAssessmentCount: number;
  mpasContributed: number;
  averageHealthScore: number | null;
}

/**
 * Get observation and contribution stats for a user
 * Fetches observation count, distinct species, and health assessment data
 */
export async function getUserObservationStats(userId: string): Promise<UserObservationStats> {
  const stats: UserObservationStats = {
    observationCount: 0,
    speciesCount: 0,
    healthAssessmentCount: 0,
    mpasContributed: 0,
    averageHealthScore: null,
  };

  if (!isSupabaseConfigured()) {
    return stats;
  }

  try {
    const supabase = createClient();

    // Fetch observation count
    const { count: obsCount, error: obsError } = await supabase
      .from('observations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_draft', false);

    if (!obsError && obsCount !== null) {
      stats.observationCount = obsCount;
    }

    // Fetch distinct species count
    const { data: speciesData, error: speciesError } = await supabase
      .from('observations')
      .select('species_name')
      .eq('user_id', userId)
      .eq('is_draft', false)
      .not('species_name', 'is', null);

    if (!speciesError && speciesData) {
      const uniqueSpecies = new Set(
        (speciesData as Array<{ species_name: string }>).map(row => row.species_name)
      );
      stats.speciesCount = uniqueSpecies.size;
    }

    // Fetch health assessment stats
    const { data: healthData, error: healthError } = await supabase
      .from('user_health_assessments')
      .select('score, mpa_id')
      .eq('user_id', userId);

    if (!healthError && healthData && healthData.length > 0) {
      stats.healthAssessmentCount = healthData.length;
      const uniqueMPAs = new Set(healthData.map((row: { mpa_id: string }) => row.mpa_id));
      stats.mpasContributed = uniqueMPAs.size;
      const totalScore = healthData.reduce((sum: number, row: { score: number }) => sum + row.score, 0);
      stats.averageHealthScore = Math.round((totalScore / healthData.length) * 10) / 10;
    }
  } catch (error) {
    console.error('Failed to fetch user observation stats:', error);
  }

  return stats;
}

/**
 * Determine the initial quality tier based on observation data
 */
function determineInitialTier(
  photoUrl: string | null,
  latitude: number | null,
  speciesName: string | null
): QualityTier {
  if (photoUrl && latitude !== null && speciesName) {
    return 'needs_id';
  }
  return 'casual';
}
