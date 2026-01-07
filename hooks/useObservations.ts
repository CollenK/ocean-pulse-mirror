/**
 * useObservations Hook
 * Fetches observations for an MPA from Supabase (with local fallback)
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchObservationsForMPA, getObservationCountForMPA, ObservationWithProfile } from '@/lib/observations-service';

interface UseObservationsOptions {
  enabled?: boolean;
}

interface UseObservationsResult {
  observations: ObservationWithProfile[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch observations for a specific MPA
 */
export function useObservations(
  mpaId: string,
  options: UseObservationsOptions = {}
): UseObservationsResult {
  const { enabled = true } = options;

  const [observations, setObservations] = useState<ObservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchObservations = useCallback(async () => {
    if (!mpaId || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [mpaObservations, count] = await Promise.all([
        fetchObservationsForMPA(mpaId),
        getObservationCountForMPA(mpaId),
      ]);

      setObservations(mpaObservations);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to fetch observations:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch observations'));
    } finally {
      setLoading(false);
    }
  }, [mpaId, enabled]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  return {
    observations,
    loading,
    error,
    totalCount,
    refetch: fetchObservations,
  };
}
