/**
 * useVerifications Hook
 * Provides verification data and submission for observations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getVerificationsForObservation,
  submitVerification,
  fetchObservationsNeedingVerification,
} from '@/lib/verification-service';
import type { Verification, VerificationConsensus, SubmitVerificationInput } from '@/types/verification';
import type { ObservationWithProfile } from '@/lib/observations-service';

/**
 * Hook to fetch verifications for a specific observation
 */
export function useVerifications(observationId: string | null) {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVerifications = useCallback(async () => {
    if (!observationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getVerificationsForObservation(observationId);
      setVerifications(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch verifications'));
    } finally {
      setLoading(false);
    }
  }, [observationId]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  return { verifications, loading, error, refetch: fetchVerifications };
}

/**
 * Hook for submitting a verification
 */
export function useSubmitVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (input: SubmitVerificationInput): Promise<VerificationConsensus | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitVerification(input);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to submit verification');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error };
}

/**
 * Hook to fetch observations needing verification
 */
export function useVerificationFeed(mpaId?: string) {
  const [observations, setObservations] = useState<ObservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchObservationsNeedingVerification(mpaId);
      setObservations(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch verification feed'));
    } finally {
      setLoading(false);
    }
  }, [mpaId]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { observations, loading, error, refetch: fetchFeed };
}
