/**
 * useHybridHealthScore Hook
 * Uses the Python backend for health scores when available,
 * falls back to client-side calculation otherwise
 * Now includes community-contributed health assessments and fishing compliance data
 */

import { useMemo, useState, useEffect } from 'react';
import { useBackendHealthScore } from './useBackendData';
import { getUserHealthScoreForMPA } from '@/lib/offline-storage';
import type { MPAAbundanceSummary } from '@/types/obis-abundance';
import type { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import type { MPATrackingSummary } from '@/types/obis-tracking';
import type { GFWComplianceScore } from '@/types/gfw';

interface UserHealthData {
  averageScore: number | null;
  count: number;
}

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
  // Include community assessments in score
  includeCommunityAssessments?: boolean;
  // Fishing compliance data from Global Fishing Watch
  fishingCompliance?: GFWComplianceScore | null;
  fishingComplianceLoading?: boolean;
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
    // Community assessments
    communityAssessment?: { score: number; weight: number; available: boolean; count: number };
    // Fishing compliance from Global Fishing Watch
    fishingCompliance?: { score: number; weight: number; available: boolean; violations: number };
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
  communityData?: {
    averageScore: number;
    assessmentCount: number;
  };
  fishingData?: {
    complianceScore: number;
    violations: number;
    fishingHoursInside: number;
  };
}

/**
 * Hybrid health score hook that tries backend first, falls back to client-side
 * Optionally includes community-contributed health assessments
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
  includeCommunityAssessments = true,
  fishingCompliance = null,
  fishingComplianceLoading = false,
}: HybridHealthScoreInput): HybridHealthScore {
  // State for community assessments
  const [communityData, setCommunityData] = useState<UserHealthData>({ averageScore: null, count: 0 });
  const [communityLoading, setCommunityLoading] = useState(true);

  // Fetch community assessments
  useEffect(() => {
    if (!mpaId || !includeCommunityAssessments) {
      setCommunityLoading(false);
      return;
    }

    setCommunityLoading(true);
    getUserHealthScoreForMPA(mpaId)
      .then(data => {
        setCommunityData({
          averageScore: data.averageScore,
          count: data.count,
        });
      })
      .catch(error => {
        console.error('Failed to fetch community health assessments:', error);
      })
      .finally(() => {
        setCommunityLoading(false);
      });
  }, [mpaId, includeCommunityAssessments]);

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
      const breakdown: HybridHealthScore['breakdown'] = {
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

      // Add community assessment if available
      const hasCommunityData = communityData.averageScore !== null && communityData.count > 0;
      if (hasCommunityData) {
        // Convert 1-10 scale to 0-100
        breakdown.communityAssessment = {
          score: (communityData.averageScore! / 10) * 100,
          weight: 10, // Community assessments get 10% weight
          available: true,
          count: communityData.count,
        };
      }

      // Add fishing compliance if available (from Global Fishing Watch)
      const hasFishingData = fishingCompliance !== null;
      if (hasFishingData) {
        breakdown.fishingCompliance = {
          score: fishingCompliance!.score,
          weight: 10, // Fishing compliance gets 10% weight
          available: true,
          violations: fishingCompliance!.violations,
        };
      }

      // Count available data sources
      const dataSourcesAvailable = [
        breakdown.populationTrends.available,
        breakdown.habitatQuality.available,
        breakdown.speciesDiversity.available,
        breakdown.thermalStress?.available,
        breakdown.productivity?.available,
        breakdown.communityAssessment?.available,
        breakdown.fishingCompliance?.available,
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

      // Blend community and fishing scores into overall score if available
      let finalScore = overall_score;
      let remainingWeight = 1.0;

      if (hasCommunityData && communityData.averageScore !== null) {
        const communityScoreNormalized = (communityData.averageScore / 10) * 100;
        // Community gets 10% weight
        finalScore = finalScore * 0.9 + communityScoreNormalized * 0.1;
        remainingWeight -= 0.1;
      }

      if (hasFishingData) {
        // Fishing compliance gets 10% weight (reduces other weights proportionally)
        const fishingWeight = 0.1;
        finalScore = finalScore * (1 - fishingWeight) + fishingCompliance!.score * fishingWeight;
      }

      finalScore = Math.round(finalScore);

      return {
        score: finalScore,
        loading: backendLoading || communityLoading || fishingComplianceLoading,
        breakdown,
        confidence: confidence as 'high' | 'medium' | 'low',
        dataSourcesAvailable,
        source: 'backend' as const,
        backendAvailable: true,
        environmentalData: environmentalDataMapped,
        communityData: hasCommunityData ? {
          averageScore: communityData.averageScore!,
          assessmentCount: communityData.count,
        } : undefined,
        fishingData: hasFishingData ? {
          complianceScore: fishingCompliance!.score,
          violations: fishingCompliance!.violations,
          fishingHoursInside: fishingCompliance!.fishingHoursInside,
        } : undefined,
      };
    }

    // Fallback to client-side calculation
    const populationScore = calculatePopulationScore(abundanceSummary);
    const habitatScore = calculateHabitatScore(environmentalSummary);
    const diversityScore = calculateDiversityScore(indicatorSpeciesCount, trackingSummary);

    const hasPopulationData = abundanceSummary && abundanceSummary.speciesTrends.length > 0;
    const hasHabitatData = environmentalSummary && environmentalSummary.parameters.length > 0;
    const hasDiversityData = indicatorSpeciesCount > 0;
    const hasCommunityData = communityData.averageScore !== null && communityData.count > 0;
    const hasFishingData = fishingCompliance !== null;

    // Community score normalized to 0-100
    const communityScore = hasCommunityData ? (communityData.averageScore! / 10) * 100 : 0;
    // Fishing compliance score (already 0-100)
    const fishingScore = hasFishingData ? fishingCompliance!.score : 0;

    // Base weights (adjusted to include community and fishing)
    let populationWeight = 0.30;
    let habitatWeight = 0.25;
    let diversityWeight = 0.20;
    let communityWeight = hasCommunityData ? 0.10 : 0;
    let fishingWeight = hasFishingData ? 0.15 : 0;

    const availableSources = [hasPopulationData, hasHabitatData, hasDiversityData, hasCommunityData, hasFishingData].filter(Boolean).length;

    if (availableSources === 0) {
      return {
        score: 0,
        loading: clientLoading || communityLoading || fishingComplianceLoading,
        breakdown: {
          populationTrends: { score: 0, weight: 30, available: false },
          habitatQuality: { score: 0, weight: 25, available: false },
          speciesDiversity: { score: 0, weight: 20, available: false },
          communityAssessment: { score: 0, weight: 10, available: false, count: 0 },
          fishingCompliance: { score: 0, weight: 15, available: false, violations: 0 },
        },
        confidence: 'low',
        dataSourcesAvailable: 0,
        source: 'client' as const,
        backendAvailable: false,
      };
    }

    // Redistribute weights for missing data (excluding community and fishing weight redistribution)
    const dataWeights = {
      population: hasPopulationData ? populationWeight : 0,
      habitat: hasHabitatData ? habitatWeight : 0,
      diversity: hasDiversityData ? diversityWeight : 0,
    };

    const totalDataWeight = dataWeights.population + dataWeights.habitat + dataWeights.diversity;
    const targetDataWeight = 1 - communityWeight - fishingWeight;

    if (totalDataWeight > 0) {
      const scaleFactor = targetDataWeight / totalDataWeight;
      populationWeight = dataWeights.population * scaleFactor;
      habitatWeight = dataWeights.habitat * scaleFactor;
      diversityWeight = dataWeights.diversity * scaleFactor;
    }

    // Calculate weighted score
    let compositeScore = Math.round(
      (hasPopulationData ? populationScore * populationWeight : 0) +
      (hasHabitatData ? habitatScore * habitatWeight : 0) +
      (hasDiversityData ? diversityScore * diversityWeight : 0) +
      (hasCommunityData ? communityScore * communityWeight : 0) +
      (hasFishingData ? fishingScore * fishingWeight : 0)
    );

    const confidence: 'high' | 'medium' | 'low' =
      availableSources >= 4 ? 'high' :
      availableSources >= 2 ? 'medium' : 'low';

    return {
      score: Math.min(100, Math.max(0, compositeScore)),
      loading: clientLoading || communityLoading || fishingComplianceLoading,
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
        communityAssessment: {
          score: communityScore,
          weight: Math.round(communityWeight * 100),
          available: hasCommunityData,
          count: communityData.count,
        },
        fishingCompliance: {
          score: fishingScore,
          weight: Math.round(fishingWeight * 100),
          available: hasFishingData,
          violations: hasFishingData ? fishingCompliance!.violations : 0,
        },
      },
      confidence,
      dataSourcesAvailable: availableSources,
      source: 'client' as const,
      backendAvailable: false,
      communityData: hasCommunityData ? {
        averageScore: communityData.averageScore!,
        assessmentCount: communityData.count,
      } : undefined,
      fishingData: hasFishingData ? {
        complianceScore: fishingCompliance!.score,
        violations: fishingCompliance!.violations,
        fishingHoursInside: fishingCompliance!.fishingHoursInside,
      } : undefined,
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
    communityData,
    communityLoading,
    fishingCompliance,
    fishingComplianceLoading,
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
