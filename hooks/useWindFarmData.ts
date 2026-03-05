/**
 * useWindFarmData Hook
 *
 * Fetches and caches offshore wind farm data from EMODnet using TanStack Query.
 * Provides wind farm polygons, conflict detection with MPAs, and summary stats.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  fetchWindFarms,
  detectConflicts,
  computeWindFarmSummary,
  windFarmsToGeoJSON,
} from '@/lib/wind-farm-service';
import type { MPA } from '@/types';
import type { WindFarm, WindFarmMPAConflict, WindFarmSummary } from '@/types/wind-farms';

const WIND_FARMS_QUERY_KEY = ['wind-farms'] as const;
const STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours (data updates infrequently)

/**
 * Fetch all wind farm data with caching.
 */
export function useWindFarms(enabled = true) {
  return useQuery<WindFarm[]>({
    queryKey: WIND_FARMS_QUERY_KEY,
    queryFn: fetchWindFarms,
    staleTime: STALE_TIME,
    gcTime: STALE_TIME * 2,
    enabled,
    retry: 2,
  });
}

/**
 * Full wind farm data with conflict detection against current MPAs.
 * Computes GeoJSON, conflicts, and summary statistics.
 */
export function useWindFarmLayer(mpas: MPA[], enabled = true) {
  const { data: windFarms, isLoading, error } = useWindFarms(enabled);

  // Convert to GeoJSON for map rendering
  const geojson = useMemo(() => {
    if (!windFarms || windFarms.length === 0) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    return windFarmsToGeoJSON(windFarms);
  }, [windFarms]);

  // Detect spatial conflicts between wind farms and MPAs
  const conflicts = useMemo<WindFarmMPAConflict[]>(() => {
    if (!windFarms || windFarms.length === 0 || mpas.length === 0) return [];
    return detectConflicts(windFarms, mpas);
  }, [windFarms, mpas]);

  // Summary statistics
  const summary = useMemo<WindFarmSummary | null>(() => {
    if (!windFarms || windFarms.length === 0) return null;
    return computeWindFarmSummary(windFarms, conflicts);
  }, [windFarms, conflicts]);

  return {
    windFarms: windFarms ?? [],
    geojson,
    conflicts,
    summary,
    isLoading,
    error,
  };
}

/**
 * Get conflicts for a specific MPA.
 */
export function useWindFarmConflictsForMPA(mpaId: string, mpas: MPA[], enabled = true) {
  const { conflicts, windFarms, isLoading } = useWindFarmLayer(mpas, enabled);

  const mpaConflicts = useMemo(() => {
    return conflicts.filter((c) => c.mpaId === mpaId);
  }, [conflicts, mpaId]);

  const nearbyWindFarms = useMemo(() => {
    const conflictFarmIds = new Set(mpaConflicts.map((c) => c.windFarmId));
    return windFarms.filter((f) => conflictFarmIds.has(f.id));
  }, [mpaConflicts, windFarms]);

  return {
    conflicts: mpaConflicts,
    nearbyWindFarms,
    isLoading,
    hasConflicts: mpaConflicts.length > 0,
  };
}

/**
 * Prefetch wind farm data for faster subsequent loads.
 */
export function usePrefetchWindFarms() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: WIND_FARMS_QUERY_KEY,
      queryFn: fetchWindFarms,
      staleTime: STALE_TIME,
    });
  };
}
