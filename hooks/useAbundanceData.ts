/**
 * Custom hook for loading and managing MPA abundance data
 * Handles caching, API fetching, and data processing
 * Filters data to show only indicator species
 */

import { useState, useEffect, useRef } from 'react';
import { MPAAbundanceSummary } from '@/types/obis-abundance';
import {
  getCachedAbundanceSummary,
  cacheAbundanceSummary,
  fetchAbundanceData,
  processSpeciesTrends,
  calculateOverallBiodiversity,
} from '@/lib/obis-abundance';

export interface UseAbundanceDataOptions {
  mpaId: string;
  center: [number, number];
  radiusKm?: number;
  mpaInfo?: {
    latitude: number;
    longitude: number;
    name: string;
    description?: string;
  };
}

export interface UseAbundanceDataResult {
  summary: MPAAbundanceSummary | null;
  loading: boolean;
  error: string | null;
  progress: number;
  refetch: () => void;
}

/**
 * Hook to fetch and manage abundance data for an MPA
 * Filters to show only indicator species relevant to the MPA's ecosystem
 *
 * @param mpaId - The unique identifier for the MPA
 * @param center - The center coordinates [lat, lng] of the MPA
 * @param radiusKm - The radius in kilometers to search around the center (default: 50)
 * @param mpaInfo - Optional MPA info for indicator species filtering
 * @returns Object containing summary data, loading state, error, and progress
 */
export function useAbundanceData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50,
  mpaInfo?: { latitude: number; longitude: number; name: string; description?: string }
): UseAbundanceDataResult {
  const [summary, setSummary] = useState<MPAAbundanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAbundanceData() {
      try {
        setLoading(true);
        setError(null);
        setProgress(10);

        // Try cache first
        const cached = await getCachedAbundanceSummary(mpaId);
        if (cached && isMounted) {
          setSummary(cached);
          setLoading(false);
          setProgress(100);
          return;
        }

        setProgress(20);

        // Fetch from OBIS (filtered by indicator species)
        const records = await fetchAbundanceData(mpaId, center, radiusKm, mpaInfo);

        if (!isMounted) return;
        setProgress(60);

        // Check if we have any data
        if (records.length === 0) {
          const emptyummary: MPAAbundanceSummary = {
            mpaId,
            speciesTrends: [],
            overallBiodiversity: {
              speciesCount: 0,
              trendDirection: 'stable',
              healthScore: 0,
            },
            dataQuality: {
              recordsWithAbundance: 0,
              totalRecords: 0,
              coveragePercent: 0,
            },
            lastUpdated: Date.now(),
          };

          setSummary(emptyummary);
          setLoading(false);
          setProgress(100);
          return;
        }

        // Process and aggregate data
        const speciesTrends = processSpeciesTrends(records);

        if (!isMounted) return;

        setProgress(80);

        // Calculate overall biodiversity metrics
        const overallBiodiversity = calculateOverallBiodiversity(speciesTrends);

        const abundanceSummary: MPAAbundanceSummary = {
          mpaId,
          speciesTrends,
          overallBiodiversity,
          dataQuality: {
            recordsWithAbundance: records.length,
            totalRecords: records.length,
            coveragePercent: 100, // All fetched records have abundance data
          },
          lastUpdated: Date.now(),
        };

        setProgress(90);

        // Cache the result
        await cacheAbundanceSummary(mpaId, abundanceSummary);

        if (isMounted) {
          setSummary(abundanceSummary);
          setProgress(100);
        }
      } catch (err) {
        console.error('[useAbundanceData] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load abundance data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAbundanceData();

    return () => {
      isMounted = false;
    };
  }, [mpaId, center[0], center[1], radiusKm, refetchTrigger, mpaInfo?.name]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { summary, loading, error, progress, refetch };
}
