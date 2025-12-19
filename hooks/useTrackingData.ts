/**
 * useTrackingData Hook
 * Custom hook for fetching and managing tracking data for marine megafauna
 */

import { useState, useEffect, useRef } from 'react';
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

  // Use ref to store mpaBoundary to avoid infinite loops
  const boundaryRef = useRef(mpaBoundary);
  boundaryRef.current = mpaBoundary;

  // Track if we've already fetched for this MPA
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !mpaId || !wkt || mpaBoundary.length === 0) {
      return;
    }

    // Prevent duplicate fetches for the same MPA
    if (fetchedRef.current === mpaId) {
      return;
    }

    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Try cache first
        const cached = await getCachedTrackingSummary(mpaId);
        if (cached && isMounted) {
          setSummary(cached);
          setProgress(100);
          setLoading(false);
          fetchedRef.current = mpaId;
          return;
        }

        // Fetch fresh data
        const trackingSummary = await fetchTrackingData(
          mpaId,
          wkt,
          boundaryRef.current,
          (p) => isMounted && setProgress(p)
        );

        if (isMounted) {
          setSummary(trackingSummary);
          fetchedRef.current = mpaId;

          // Cache the result
          await cacheTrackingSummary(trackingSummary);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tracking data'));
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [mpaId, wkt, enabled, mpaBoundary.length]);

  const refetch = async () => {
    fetchedRef.current = null;
    // Trigger re-fetch by resetting the ref
  };

  return {
    summary,
    loading,
    error,
    progress,
    refetch,
  };
}
