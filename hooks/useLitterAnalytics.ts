/**
 * useLitterAnalytics Hook
 *
 * Fetches and caches litter analytics data for an MPA.
 * Used by the MPA detail page's Litter Pressure dashboard.
 */

import { useState, useEffect } from 'react';
import { getLitterAnalytics, type LitterAnalytics } from '@/lib/litter-analytics-service';

interface UseLitterAnalyticsResult {
  analytics: LitterAnalytics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useLitterAnalytics(
  mpaId: string | undefined,
  enabled = true
): UseLitterAnalyticsResult {
  const [analytics, setAnalytics] = useState<LitterAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    if (!mpaId || !enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getLitterAnalytics(mpaId)
      .then(data => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [mpaId, enabled, fetchCount]);

  const refetch = () => setFetchCount(c => c + 1);

  return { analytics, loading, error, refetch };
}
