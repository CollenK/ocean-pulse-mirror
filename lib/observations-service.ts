/**
 * Observations Service
 * Handles CRUD operations for observations in Supabase
 * Falls back to IndexedDB for offline support
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { saveObservation as saveObservationLocal, getObservationsForMPA as getLocalObservations } from '@/lib/offline-storage';
import type { ReportType } from '@/types';
import type { Json, ObservationRow } from '@/types/supabase';

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
}

export interface ObservationWithProfile extends ObservationRow {
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Create a new observation
 * Saves to Supabase if available, falls back to IndexedDB
 */
export async function createObservation(input: CreateObservationInput): Promise<{ id: string; synced: boolean }> {
  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();

      const observationData = {
        mpa_id: input.mpaId,
        user_id: input.userId || null,
        report_type: input.reportType,
        species_name: input.speciesName || null,
        species_type: input.speciesType || null,
        quantity: input.quantity || null,
        notes: input.notes || null,
        latitude: input.latitude,
        longitude: input.longitude,
        location_accuracy_m: input.locationAccuracy || null,
        location_manually_entered: true,
        photo_url: input.photoUrl || null,
        photo_metadata: input.photoMetadata || null,
        health_score_assessment: input.healthScoreAssessment || null,
        is_draft: false,
        synced_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from('observations') as any)
        .insert(observationData)
        .select('id')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      // Also save health assessment if provided
      if (input.healthScoreAssessment && input.mpaId && input.userId) {
        const healthData = {
          mpa_id: input.mpaId,
          user_id: input.userId,
          observation_id: data.id,
          score: input.healthScoreAssessment,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('user_health_assessments') as any).insert(healthData);
      }

      return { id: data.id, synced: true };
    } catch (error) {
      console.error('Failed to save to Supabase, falling back to local storage:', error);
    }
  }

  // Fallback to IndexedDB
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
 * Fetch observations for an MPA
 * Fetches from Supabase if available, includes local unsynced observations
 */
export async function fetchObservationsForMPA(mpaId: string): Promise<ObservationWithProfile[]> {
  const observations: ObservationWithProfile[] = [];

  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('observations')
        .select(`
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('mpa_id', mpaId)
        .eq('is_draft', false)
        .order('observed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase fetch error:', error);
      } else if (data) {
        observations.push(...(data as ObservationWithProfile[]));
      }
    } catch (error) {
      console.error('Failed to fetch from Supabase:', error);
    }
  }

  // Also get local unsynced observations
  try {
    const localObs = await getLocalObservations(mpaId);
    const unsyncedLocal = localObs.filter(obs => !obs.synced);

    // Convert local observations to match Supabase format
    for (const local of unsyncedLocal) {
      observations.push({
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
        observed_at: new Date(local.timestamp).toISOString(),
        created_at: new Date(local.timestamp).toISOString(),
        updated_at: new Date(local.timestamp).toISOString(),
        profiles: null,
      });
    }
  } catch (error) {
    console.error('Failed to fetch local observations:', error);
  }

  // Sort by observed_at, newest first
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
 * Upload photo to Supabase Storage
 * Returns the public URL of the uploaded photo
 */
export async function uploadObservationPhoto(
  photoBase64: string,
  userId: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = createClient();

    // Convert base64 to blob
    const base64Data = photoBase64.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    // Generate unique filename
    const filename = `${userId}/${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('observation-photos')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('observation-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload photo:', error);
    return null;
  }
}
