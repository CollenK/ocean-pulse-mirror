/**
 * TanStack Query hooks for backend data service
 * These hooks fetch data from the Python FastAPI backend
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import {
  dataService,
  HealthScoreResponse,
  EnvironmentalDataResponse,
  SpeciesDataResponse,
  SpeciesListResponse,
  SSTTimeseriesResponse,
} from '@/lib/api/data-service';

interface MPAParams {
  mpaId: string;
  name: string;
  lat: number;
  lon: number;
}

/**
 * Hook to fetch comprehensive health score from the backend
 */
export function useBackendHealthScore(
  params: MPAParams | null,
  options?: Omit<UseQueryOptions<HealthScoreResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<HealthScoreResponse, Error>({
    queryKey: ['backend-health-score', params?.mpaId],
    queryFn: () => {
      if (!params) throw new Error('MPA params required');
      return dataService.getHealthScore(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
}

/**
 * Hook to fetch environmental data from Copernicus via backend
 */
export function useBackendEnvironmentalData(
  params: { mpaId: string; lat: number; lon: number } | null,
  options?: Omit<UseQueryOptions<EnvironmentalDataResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<EnvironmentalDataResponse, Error>({
    queryKey: ['backend-environmental', params?.mpaId],
    queryFn: () => {
      if (!params) throw new Error('MPA params required');
      return dataService.getEnvironmentalData(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 30, // 30 minutes
    ...options,
  });
}

/**
 * Hook to fetch species data from OBIS via backend
 */
export function useBackendSpeciesData(
  params: { mpaId: string; lat: number; lon: number; radiusKm?: number } | null,
  options?: Omit<UseQueryOptions<SpeciesDataResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SpeciesDataResponse, Error>({
    queryKey: ['backend-species', params?.mpaId, params?.radiusKm],
    queryFn: () => {
      if (!params) throw new Error('MPA params required');
      return dataService.getSpeciesData(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
}

/**
 * Hook to fetch species list from OBIS via backend
 */
export function useBackendSpeciesList(
  params: { mpaId: string; lat: number; lon: number; radiusKm?: number; limit?: number } | null,
  options?: Omit<UseQueryOptions<SpeciesListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SpeciesListResponse, Error>({
    queryKey: ['backend-species-list', params?.mpaId, params?.radiusKm, params?.limit],
    queryFn: () => {
      if (!params) throw new Error('MPA params required');
      return dataService.getSpeciesList(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
}

/**
 * Hook to fetch SST time series from Copernicus via backend
 */
export function useBackendSSTTimeseries(
  params: { mpaId: string; lat: number; lon: number; days?: number } | null,
  options?: Omit<UseQueryOptions<SSTTimeseriesResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SSTTimeseriesResponse, Error>({
    queryKey: ['backend-sst-timeseries', params?.mpaId, params?.days],
    queryFn: () => {
      if (!params) throw new Error('MPA params required');
      return dataService.getSSTTimeseries(params);
    },
    enabled: !!params,
    staleTime: 1000 * 60 * 60 * 6, // 6 hours
    ...options,
  });
}

/**
 * Hook to check backend health
 */
export function useBackendHealth(
  options?: Omit<UseQueryOptions<{ status: string; service: string }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<{ status: string; service: string }, Error>({
    queryKey: ['backend-health'],
    queryFn: () => dataService.healthCheck(),
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
    ...options,
  });
}
