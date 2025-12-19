/**
 * Custom hook for loading and managing MPA environmental data
 * Handles caching, API fetching, and data processing
 */

import { useState, useEffect } from 'react';
import { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import {
  getCachedEnvironmentalSummary,
  cacheEnvironmentalSummary,
  fetchEnvironmentalData,
  processEnvironmentalParameters,
  detectAnomalies,
  calculateHabitatQualityScore,
} from '@/lib/obis-environmental';

export interface UseEnvironmentalDataResult {
  summary: MPAEnvironmentalSummary | null;
  loading: boolean;
  error: string | null;
  progress: number;
  refetch: () => void;
}

/**
 * Hook to fetch and manage environmental data for an MPA
 *
 * @param mpaId - The unique identifier for the MPA
 * @param center - The center coordinates [lat, lng] of the MPA
 * @param radiusKm - The radius in kilometers to search around the center (default: 50)
 * @returns Object containing summary data, loading state, error, and progress
 */
export function useEnvironmentalData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50
): UseEnvironmentalDataResult {
  const [summary, setSummary] = useState<MPAEnvironmentalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadEnvironmentalData() {
      try {
        console.log('[useEnvironmentalData] Starting load for MPA:', mpaId);
        setLoading(true);
        setError(null);
        setProgress(10);

        // Try cache first
        const cached = await getCachedEnvironmentalSummary(mpaId);
        if (cached && isMounted) {
          console.log('[useEnvironmentalData] Using cached data');
          setSummary(cached);
          setLoading(false);
          setProgress(100);
          return;
        }

        setProgress(20);

        // Fetch from OBIS
        console.log('[useEnvironmentalData] Fetching from OBIS API...');
        const measurements = await fetchEnvironmentalData(mpaId, center, radiusKm);

        if (!isMounted) return;

        console.log(`[useEnvironmentalData] Fetched ${measurements.length} measurements`);
        setProgress(60);

        // Check if we have any data
        if (measurements.length === 0) {
          console.log('[useEnvironmentalData] No environmental data available');
          const emptySummary: MPAEnvironmentalSummary = {
            mpaId,
            parameters: [],
            habitatQualityScore: 0,
            anomalies: [],
            dataQuality: {
              measurementsCount: 0,
              parametersCount: 0,
              coveragePercent: 0,
            },
            lastUpdated: Date.now(),
          };

          setSummary(emptySummary);
          setLoading(false);
          setProgress(100);
          return;
        }

        // Process measurements into parameters
        console.log('[useEnvironmentalData] Processing environmental parameters...');
        const parameters = processEnvironmentalParameters(measurements);

        if (!isMounted) return;

        setProgress(80);

        // Detect anomalies
        console.log('[useEnvironmentalData] Detecting anomalies...');
        const allAnomalies: any[] = [];
        for (const param of parameters) {
          const paramAnomalies = detectAnomalies(param.dataPoints, param.threshold);
          allAnomalies.push(...paramAnomalies.map(a => ({ ...a, parameter: param.name })));
        }

        // Calculate habitat quality score
        console.log('[useEnvironmentalData] Calculating habitat quality score...');
        const habitatQualityScore = calculateHabitatQualityScore(parameters);

        const environmentalSummary: MPAEnvironmentalSummary = {
          mpaId,
          parameters,
          habitatQualityScore,
          anomalies: allAnomalies,
          dataQuality: {
            measurementsCount: measurements.length,
            parametersCount: parameters.length,
            coveragePercent: parameters.length > 0 ? 100 : 0,
          },
          lastUpdated: Date.now(),
        };

        setProgress(90);

        // Cache the result
        console.log('[useEnvironmentalData] Caching results...');
        await cacheEnvironmentalSummary(mpaId, environmentalSummary);

        if (isMounted) {
          setSummary(environmentalSummary);
          setProgress(100);
          console.log('[useEnvironmentalData] Load complete');
        }
      } catch (err) {
        console.error('[useEnvironmentalData] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load environmental data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEnvironmentalData();

    return () => {
      isMounted = false;
    };
  }, [mpaId, center[0], center[1], radiusKm, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { summary, loading, error, progress, refetch };
}
