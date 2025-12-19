/**
 * useTrackingData Hook
 * Custom hook for fetching and managing tracking data for marine megafauna
 */

import { useState, useEffect, useCallback } from 'react';
import type { MPATrackingSummary } from '@/types/obis-tracking';
import {
  fetchTrackingData,
  getCachedTrackingSummary,
  cacheTrackingSummary,
} from '@/lib/obis-tracking';

interface UseTrackingDataOptions {
  mpaId: string;
  wkt: string;
  mpaBoundary: [number, number][];
  enabled?: boolean;
}

interface UseTrackingDataReturn {
  summary: MPATrackingSummary | null;
  loading: boolean;
  error: Error | null;
  progress: number;
  refetch: () => Promise<void>;
}

export function useTrackingData({
  mpaId,
  wkt,
  mpaBoundary,
  enabled = true,
}: UseTrackingDataOptions): UseTrackingDataReturn {
  const [summary, setSummary] = useState<MPATrackingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const fetchData = useCallback(async () => {
    if (!enabled || !mpaId || !wkt || !mpaBoundary) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      // Try cache first
      const cached = await getCachedTrackingSummary(mpaId);
      if (cached) {
        setSummary(cached);
        setProgress(100);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const trackingSummary = await fetchTrackingData(
        mpaId,
        wkt,
        mpaBoundary,
        setProgress
      );

      setSummary(trackingSummary);

      // Cache the result
      await cacheTrackingSummary(trackingSummary);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tracking data'));
      setLoading(false);
    }
  }, [mpaId, wkt, mpaBoundary, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    loading,
    error,
    progress,
    refetch: fetchData,
  };
}
