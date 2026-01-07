/**
 * useHybridHealthScore Hook
 * Uses the Python backend for health scores when available,
 * falls back to client-side calculation otherwise
 */

import { useMemo } from 'react';
import { useBackendHealthScore } from './useBackendData';
import type { MPAAbundanceSummary } from '@/types/obis-abundance';
import type { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import type { MPATrackingSummary } from '@/types/obis-tracking';

interface HybridHealthScoreInput {
  mpaId: string;
  mpaName: string;
  lat: number;
  lon: number;
  // Client-side data for fallback
  abundanceSummary: MPAAbundanceSummary | null;
  abundanceLoading: boolean;
  environmentalSummary: MPAEnvironmentalSummary | null;
  environmentalLoading: boolean;
  trackingSummary: MPATrackingSummary | null;
  trackingLoading: boolean;
  indicatorSpeciesCount: number;
  // Option to prefer backend
  preferBackend?: boolean;
}

interface HybridHealthScore {
  score: number;
  loading: boolean;
  breakdown: {
    populationTrends: { score: number; weight: number; available: boolean };
    habitatQuality: { score: number; weight: number; available: boolean };
    speciesDiversity: { score: number; weight: number; available: boolean };
    // Additional backend-specific metrics
    thermalStress?: { score: number; weight: number; available: boolean };
    productivity?: { score: number; weight: number; available: boolean };
  };
  confidence: 'high' | 'medium' | 'low';
  dataSourcesAvailable: number;
  source: 'backend' | 'client' | 'mixed';
  backendAvailable: boolean;
  environmentalData?: {
    sst?: { value: number; unit: string; anomaly?: number | null };
    chlorophyll?: { value: number; unit: string };
    dissolvedOxygen?: { value: number; unit: string };
    ph?: { value: number; unit: string };
    salinity?: { value: number; unit: string };
  };
}

/**
 * Hybrid health score hook that tries backend first, falls back to client-side
 */
export function useHybridHealthScore({
  mpaId,
  mpaName,
  lat,
  lon,
  abundanceSummary,
  abundanceLoading,
  environmentalSummary,
  environmentalLoading,
  trackingSummary,
  trackingLoading,
  indicatorSpeciesCount,
  preferBackend = true,
}: HybridHealthScoreInput): HybridHealthScore {
  // Try to fetch from backend
  const backendParams = preferBackend && mpaId ? {
    mpaId,
    name: mpaName,
    lat,
    lon,
  } : null;

  const {
    data: backendData,
    isLoading: backendLoading,
    isError: backendError,
  } = useBackendHealthScore(backendParams, {
    retry: 1,
    retryDelay: 1000,
  });

  return useMemo(() => {
    // Determine if we should use backend data
    const backendAvailable = !backendError && !!backendData;
    const clientLoading = abundanceLoading || environmentalLoading || trackingLoading;
    const loading = preferBackend ? (backendLoading && clientLoading) : clientLoading;

    // If backend is available and has valid data, prefer it
    if (backendAvailable && backendData) {
      const { overall_score, confidence, components, environmental_data, species_data } = backendData;

      // Map backend response to our format
      const breakdown = {
        populationTrends: {
          score: components.biodiversity || 0,
          weight: 30,
          available: (species_data?.total_species || 0) > 0,
        },
        habitatQuality: {
          score: components.water_quality || 0,
          weight: 25,
          available: !!environmental_data,
        },
        speciesDiversity: {
          score: species_data?.biodiversity_index || 0,
          weight: 20,
          available: (species_data?.total_species || 0) > 0,
        },
        thermalStress: {
          score: 100 - (components.thermal_stress || 0), // Invert - higher stress = lower score
          weight: 15,
          available: !!environmental_data?.sea_surface_temperature,
        },
        productivity: {
          score: components.productivity || 0,
          weight: 10,
          available: !!environmental_data?.chlorophyll,
        },
      };

      // Count available data sources
      const dataSourcesAvailable = [
        breakdown.populationTrends.available,
        breakdown.habitatQuality.available,
        breakdown.speciesDiversity.available,
        breakdown.thermalStress?.available,
        breakdown.productivity?.available,
      ].filter(Boolean).length;

      // Map environmental data
      const environmentalDataMapped = environmental_data ? {
        sst: environmental_data.sea_surface_temperature ? {
          value: environmental_data.sea_surface_temperature.value,
          unit: environmental_data.sea_surface_temperature.unit,
          anomaly: environmental_data.sea_surface_temperature.anomaly,
        } : undefined,
        chlorophyll: environmental_data.chlorophyll ? {
          value: environmental_data.chlorophyll.value,
          unit: environmental_data.chlorophyll.unit,
        } : undefined,
        dissolvedOxygen: environmental_data.dissolved_oxygen ? {
          value: environmental_data.dissolved_oxygen.value,
          unit: environmental_data.dissolved_oxygen.unit,
        } : undefined,
        ph: environmental_data.ph ? {
          value: environmental_data.ph.value,
          unit: environmental_data.ph.unit,
        } : undefined,
        salinity: environmental_data.salinity ? {
          value: environmental_data.salinity.value,
          unit: environmental_data.salinity.unit,
        } : undefined,
      } : undefined;

      return {
        score: overall_score,
        loading: backendLoading,
        breakdown,
        confidence: confidence as 'high' | 'medium' | 'low',
        dataSourcesAvailable,
        source: 'backend' as const,
        backendAvailable: true,
        environmentalData: environmentalDataMapped,
      };
    }

    // Fallback to client-side calculation
    const populationScore = calculatePopulationScore(abundanceSummary);
    const habitatScore = calculateHabitatScore(environmentalSummary);
    const diversityScore = calculateDiversityScore(indicatorSpeciesCount, trackingSummary);

    const hasPopulationData = abundanceSummary && abundanceSummary.speciesTrends.length > 0;
    const hasHabitatData = environmentalSummary && environmentalSummary.parameters.length > 0;
    const hasDiversityData = indicatorSpeciesCount > 0;

    // Base weights
    let populationWeight = 0.40;
    let habitatWeight = 0.35;
    let diversityWeight = 0.25;

    const availableSources = [hasPopulationData, hasHabitatData, hasDiversityData].filter(Boolean).length;

    if (availableSources === 0) {
      return {
        score: 0,
        loading: clientLoading,
        breakdown: {
          populationTrends: { score: 0, weight: 40, available: false },
          habitatQuality: { score: 0, weight: 35, available: false },
          speciesDiversity: { score: 0, weight: 25, available: false },
        },
        confidence: 'low',
        dataSourcesAvailable: 0,
        source: 'client' as const,
        backendAvailable: false,
      };
    }

    // Redistribute weights for missing data
    if (!hasPopulationData) {
      const redistribution = populationWeight / availableSources;
      if (hasHabitatData) habitatWeight += redistribution * (habitatWeight / (habitatWeight + diversityWeight));
      if (hasDiversityData) diversityWeight += redistribution * (diversityWeight / (habitatWeight + diversityWeight));
      populationWeight = 0;
    }
    if (!hasHabitatData) {
      const redistribution = habitatWeight / availableSources;
      if (hasPopulationData) populationWeight += redistribution * (populationWeight / (populationWeight + diversityWeight));
      if (hasDiversityData) diversityWeight += redistribution * (diversityWeight / (populationWeight + diversityWeight));
      habitatWeight = 0;
    }
    if (!hasDiversityData) {
      const redistribution = diversityWeight / availableSources;
      if (hasPopulationData) populationWeight += redistribution * (populationWeight / (populationWeight + habitatWeight));
      if (hasHabitatData) habitatWeight += redistribution * (habitatWeight / (populationWeight + habitatWeight));
      diversityWeight = 0;
    }

    // Normalize weights
    const totalWeight = populationWeight + habitatWeight + diversityWeight;
    populationWeight /= totalWeight;
    habitatWeight /= totalWeight;
    diversityWeight /= totalWeight;

    // Calculate weighted score
    const compositeScore = Math.round(
      (hasPopulationData ? populationScore * populationWeight : 0) +
      (hasHabitatData ? habitatScore * habitatWeight : 0) +
      (hasDiversityData ? diversityScore * diversityWeight : 0)
    );

    const confidence: 'high' | 'medium' | 'low' =
      availableSources >= 3 ? 'high' :
      availableSources >= 2 ? 'medium' : 'low';

    return {
      score: Math.min(100, Math.max(0, compositeScore)),
      loading: clientLoading,
      breakdown: {
        populationTrends: {
          score: populationScore,
          weight: Math.round(populationWeight * 100),
          available: !!hasPopulationData,
        },
        habitatQuality: {
          score: habitatScore,
          weight: Math.round(habitatWeight * 100),
          available: !!hasHabitatData,
        },
        speciesDiversity: {
          score: diversityScore,
          weight: Math.round(diversityWeight * 100),
          available: !!hasDiversityData,
        },
      },
      confidence,
      dataSourcesAvailable: availableSources,
      source: 'client' as const,
      backendAvailable: false,
    };
  }, [
    backendData,
    backendLoading,
    backendError,
    preferBackend,
    abundanceSummary,
    abundanceLoading,
    environmentalSummary,
    environmentalLoading,
    trackingSummary,
    trackingLoading,
    indicatorSpeciesCount,
  ]);
}

// Helper functions (same as useCompositeHealthScore)
function calculatePopulationScore(summary: MPAAbundanceSummary | null): number {
  if (!summary || summary.speciesTrends.length === 0) return 0;
  if (summary.overallBiodiversity?.healthScore) return summary.overallBiodiversity.healthScore;

  const trends = summary.speciesTrends;
  const validTrends = trends.filter(t => t.trend !== 'insufficient_data');
  if (validTrends.length === 0) return 50;

  const increasing = validTrends.filter(t => t.trend === 'increasing').length;
  const stable = validTrends.filter(t => t.trend === 'stable').length;
  const decreasing = validTrends.filter(t => t.trend === 'decreasing').length;

  return Math.round(((increasing * 100) + (stable * 70) + (decreasing * 30)) / validTrends.length);
}

function calculateHabitatScore(summary: MPAEnvironmentalSummary | null): number {
  if (!summary || summary.parameters.length === 0) return 0;
  return summary.habitatQualityScore || 50;
}

function calculateDiversityScore(
  indicatorSpeciesCount: number,
  trackingSummary: MPATrackingSummary | null
): number {
  if (indicatorSpeciesCount === 0) return 0;
  let diversityScore = Math.min(100, indicatorSpeciesCount * 5);
  if (trackingSummary && trackingSummary.trackedIndividuals > 0) {
    diversityScore = Math.min(100, diversityScore + 10);
  }
  return Math.round(diversityScore);
}
