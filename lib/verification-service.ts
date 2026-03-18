/**
 * Verification Service
 * Handles verification CRUD operations and consensus queries
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { captureError } from '@/lib/error-reporting';
import type { Verification, VerificationConsensus, VerificationStats, SubmitVerificationInput } from '@/types/verification';
import type { ObservationWithProfile } from '@/lib/observations-service';

/**
 * Submit or update a verification via RPC
 */
export async function submitVerification(input: SubmitVerificationInput): Promise<VerificationConsensus> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const supabase = createClient();

  const { data, error } = await supabase.rpc('submit_verification', {
    p_observation_id: input.observationId,
    p_user_id: input.userId,
    p_species_name: input.speciesName,
    p_is_agreement: input.isAgreement,
    p_confidence: input.confidence,
    p_notes: input.notes || null,
  });

  if (error) {
    captureError(error, { context: 'submitVerification', observationId: input.observationId });
    throw error;
  }

  return data as unknown as VerificationConsensus;
}

/**
 * Get all verifications for an observation with profile data
 */
export async function getVerificationsForObservation(observationId: string): Promise<Verification[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  const { data, error } = await supabase
    .from('observation_verifications')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url,
        is_expert
      )
    `)
    .eq('observation_id', observationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch verifications:', error);
    return [];
  }

  return (data || []) as Verification[];
}

/**
 * Check if a user has already verified an observation
 */
export async function getUserVerification(observationId: string, userId: string): Promise<Verification | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();

  const { data, error } = await supabase
    .from('observation_verifications')
    .select('*')
    .eq('observation_id', observationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to check user verification:', error);
    return null;
  }

  return data as Verification | null;
}

/**
 * Delete a verification and recompute consensus
 */
export async function deleteVerification(observationId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const supabase = createClient();

  const { error } = await supabase
    .from('observation_verifications')
    .delete()
    .eq('observation_id', observationId)
    .eq('user_id', userId);

  if (error) {
    captureError(error, { context: 'deleteVerification', observationId });
    throw error;
  }

  // Recompute consensus after deletion
  await supabase.rpc('compute_observation_consensus', {
    p_observation_id: observationId,
  });
}

/**
 * Fetch observations that need verification (quality_tier = 'needs_id')
 */
export async function fetchObservationsNeedingVerification(
  mpaId?: string,
  limit: number = 20
): Promise<ObservationWithProfile[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  let query = supabase
    .from('observations')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .eq('quality_tier', 'needs_id')
    .eq('is_draft', false)
    .order('observed_at', { ascending: false })
    .limit(limit);

  if (mpaId) {
    query = query.eq('mpa_id', mpaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch observations needing verification:', error);
    return [];
  }

  return (data || []) as ObservationWithProfile[];
}

/**
 * Get verification stats for a user
 */
export async function getUserVerificationStats(userId: string): Promise<VerificationStats | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_verification_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch verification stats:', error);
    return null;
  }

  return data as VerificationStats | null;
}
