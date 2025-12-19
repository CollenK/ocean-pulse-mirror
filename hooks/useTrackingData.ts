/**
 * useTrackingData Hook
 * Custom hook for fetching and managing real animal tracking data from Movebank
 */

import { useState, useEffect, useRef } from 'react';
import type { MPATrackingSummary } from '@/types/obis-tracking';
import {
  fetchMovebankTrackingData,
  getCachedMovebankSummary,
  cacheMovebankSummary,
} from '@/lib/movebank';

interface UseTrackingDataOptions {
  mpaId: string;
  mpaBoundary: [number, number][];
  enabled?: boolean;
  mpaInfo?: {
    latitude: number;
    longitude: number;
    name: string;
    description?: string;
  };
}

interface UseTrackingDataReturn {
  summary: MPATrackingSummary | null;
  loading: boolean;
  error: Error | null;
  progress: number;
  refetch: () => Promise<void>;
}

// Create empty summary for cases with no data
function createEmptySummary(mpaId: string): MPATrackingSummary {
  return {
    mpaId,
    trackedIndividuals: 0,
    species: [],
    paths: [],
    heatmapData: [],
    speciesBreakdown: [],
    dataQuality: {
      trackingRecords: 0,
      dateRange: { start: new Date().toISOString(), end: new Date().toISOString() },
    },
    lastUpdated: Date.now(),
  };
}

export function useTrackingData({
  mpaId,
  mpaBoundary,
  enabled = true,
  mpaInfo,
}: UseTrackingDataOptions): UseTrackingDataReturn {
  const [summary, setSummary] = useState<MPATrackingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start as loading
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Use ref to store mpaBoundary to avoid infinite loops
  const boundaryRef = useRef(mpaBoundary);
  boundaryRef.current = mpaBoundary;

  // Track if we've already fetched for this MPA
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    // Not enabled or missing required data - show empty state
    if (!enabled || !mpaId || mpaBoundary.length === 0 || !mpaInfo) {
      // Always set an empty summary so the "no data" message is shown
      setSummary(createEmptySummary(mpaId || 'unknown'));
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same MPA
    if (fetchedRef.current === mpaId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Try cache first
        const cached = await getCachedMovebankSummary(mpaId);
        if (cached && isMounted) {
          setSummary(cached);
          setProgress(100);
          setLoading(false);
          fetchedRef.current = mpaId;
          return;
        }

        // Fetch real tracking data from Movebank
        const center: [number, number] = [mpaInfo.latitude, mpaInfo.longitude];
        const trackingSummary = await fetchMovebankTrackingData(
          mpaId,
          center,
          boundaryRef.current,
          (p) => isMounted && setProgress(p),
          mpaInfo
        );

        if (isMounted) {
          setSummary(trackingSummary);
          fetchedRef.current = mpaId;

          // Cache the result
          await cacheMovebankSummary(trackingSummary);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tracking data'));
          // Set empty summary on error so UI shows "no data" message
          setSummary(createEmptySummary(mpaId));
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [mpaId, enabled, mpaBoundary.length, mpaInfo]);

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
