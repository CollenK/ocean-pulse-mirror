/**
 * Hook for loading and managing coastal conditions data
 * Implements cache-first strategy with 30-minute TTL
 */

import { useState, useEffect } from 'react';
import type { CoastalConditions } from '@/types/coastal-conditions';
import { fetchCoastalConditions } from '@/lib/coastal-conditions-service';
import {
  getCachedCoastalConditions,
  cacheCoastalConditions,
} from '@/lib/offline-storage';

export interface UseCoastalConditionsResult {
  conditions: CoastalConditions | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  refetch: () => void;
}

/**
 * Hook to fetch and manage beach & coastal conditions for an MPA
 *
 * @param mpaId - The MPA identifier (used as cache key)
 * @param lat - Latitude of the MPA center
 * @param lon - Longitude of the MPA center
 * @param enabled - Whether to fetch data (default true)
 */
export function useCoastalConditions(
  mpaId: string,
  lat: number,
  lon: number,
  enabled: boolean = true
): UseCoastalConditionsResult {
  const [conditions, setConditions] = useState<CoastalConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled || !mpaId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadConditions() {
      try {
        setLoading(true);
        setError(null);

        // Check cache first (non-blocking; if cache fails, continue to API)
        try {
          const cached = await getCachedCoastalConditions(mpaId);
          if (cached && isMounted) {
            setConditions(cached.conditions);

            const now = Date.now();
            const isCacheStale = now > cached.expiresAt;
            setIsStale(isCacheStale);

            if (!isCacheStale) {
              setLoading(false);
              return;
            }

            // Stale cache: show it but refetch in background
            setLoading(false);
          }
        } catch (cacheErr) {
          console.warn('[useCoastalConditions] Cache read failed, fetching from API:', cacheErr);
        }

        // Fetch fresh data from API
        const fresh = await fetchCoastalConditions(lat, lon);

        if (!isMounted) return;

        setConditions(fresh);
        setIsStale(false);

        // Cache the result (non-blocking)
        try {
          await cacheCoastalConditions(mpaId, fresh);
        } catch (cacheErr) {
          console.warn('[useCoastalConditions] Cache write failed:', cacheErr);
        }
      } catch (err) {
        console.error('[useCoastalConditions] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load conditions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadConditions();

    return () => {
      isMounted = false;
    };
  }, [mpaId, lat, lon, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { conditions, loading, error, isStale, refetch };
}
