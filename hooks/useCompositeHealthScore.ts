/**
 * useCompositeHealthScore Hook
 * Calculates an overall MPA health score from multiple real data sources:
 * - Indicator species population trends (from OBIS)
 * - Habitat quality / environmental conditions (from OBIS-ENV-DATA)
 * - Species presence/diversity
 */

import { useMemo } from 'react';
import type { MPAAbundanceSummary } from '@/types/obis-abundance';
import type { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import type { MPATrackingSummary } from '@/types/obis-tracking';

interface CompositeHealthScoreInput {
  abundanceSummary: MPAAbundanceSummary | null;
  abundanceLoading: boolean;
  environmentalSummary: MPAEnvironmentalSummary | null;
  environmentalLoading: boolean;
  trackingSummary: MPATrackingSummary | null;
  trackingLoading: boolean;
  indicatorSpeciesCount: number;
}

interface CompositeHealthScore {
  score: number;
  loading: boolean;
  breakdown: {
    populationTrends: { score: number; weight: number; available: boolean };
    habitatQuality: { score: number; weight: number; available: boolean };
    speciesDiversity: { score: number; weight: number; available: boolean };
  };
  confidence: 'high' | 'medium' | 'low';
  dataSourcesAvailable: number;
}

/**
 * Calculate composite health score from multiple data sources
 *
 * Weighting strategy:
 * - Population Trends (40%): Most important - shows if species are thriving
 * - Habitat Quality (35%): Environmental conditions that support life
 * - Species Diversity (25%): Presence of indicator species
 *
 * If a data source is unavailable, its weight is redistributed to others
 */
export function useCompositeHealthScore({
  abundanceSummary,
  abundanceLoading,
  environmentalSummary,
  environmentalLoading,
  trackingSummary,
  trackingLoading,
  indicatorSpeciesCount,
}: CompositeHealthScoreInput): CompositeHealthScore {
  return useMemo(() => {
    const loading = abundanceLoading || environmentalLoading || trackingLoading;

    // Calculate individual scores
    const populationScore = calculatePopulationScore(abundanceSummary);
    const habitatScore = calculateHabitatScore(environmentalSummary);
    const diversityScore = calculateDiversityScore(indicatorSpeciesCount, trackingSummary);

    // Determine which data sources are available
    const hasPopulationData = abundanceSummary && abundanceSummary.speciesTrends.length > 0;
    const hasHabitatData = environmentalSummary && environmentalSummary.parameters.length > 0;
    const hasDiversityData = indicatorSpeciesCount > 0;

    // Base weights
    let populationWeight = 0.40;
    let habitatWeight = 0.35;
    let diversityWeight = 0.25;

    // Count available sources and redistribute weights if needed
    const availableSources = [hasPopulationData, hasHabitatData, hasDiversityData].filter(Boolean).length;

    if (availableSources === 0) {
      // No data available - return placeholder
      return {
        score: 0,
        loading,
        breakdown: {
          populationTrends: { score: 0, weight: populationWeight, available: false },
          habitatQuality: { score: 0, weight: habitatWeight, available: false },
          speciesDiversity: { score: 0, weight: diversityWeight, available: false },
        },
        confidence: 'low',
        dataSourcesAvailable: 0,
      };
    }

    // Redistribute weights for missing data sources
    if (!hasPopulationData) {
      const redistribution = populationWeight / (availableSources);
      if (hasHabitatData) habitatWeight += redistribution * (habitatWeight / (habitatWeight + diversityWeight));
      if (hasDiversityData) diversityWeight += redistribution * (diversityWeight / (habitatWeight + diversityWeight));
      populationWeight = 0;
    }
    if (!hasHabitatData) {
      const redistribution = habitatWeight / (availableSources);
      if (hasPopulationData) populationWeight += redistribution * (populationWeight / (populationWeight + diversityWeight));
      if (hasDiversityData) diversityWeight += redistribution * (diversityWeight / (populationWeight + diversityWeight));
      habitatWeight = 0;
    }
    if (!hasDiversityData) {
      const redistribution = diversityWeight / (availableSources);
      if (hasPopulationData) populationWeight += redistribution * (populationWeight / (populationWeight + habitatWeight));
      if (hasHabitatData) habitatWeight += redistribution * (habitatWeight / (populationWeight + habitatWeight));
      diversityWeight = 0;
    }

    // Normalize weights to sum to 1
    const totalWeight = populationWeight + habitatWeight + diversityWeight;
    populationWeight /= totalWeight;
    habitatWeight /= totalWeight;
    diversityWeight /= totalWeight;

    // Calculate weighted composite score
    const compositeScore = Math.round(
      (hasPopulationData ? populationScore * populationWeight : 0) +
      (hasHabitatData ? habitatScore * habitatWeight : 0) +
      (hasDiversityData ? diversityScore * diversityWeight : 0)
    );

    // Determine confidence level based on data availability
    const confidence: 'high' | 'medium' | 'low' =
      availableSources >= 3 ? 'high' :
      availableSources >= 2 ? 'medium' : 'low';

    return {
      score: Math.min(100, Math.max(0, compositeScore)),
      loading,
      breakdown: {
        populationTrends: {
          score: populationScore,
          weight: Math.round(populationWeight * 100),
          available: !!hasPopulationData
        },
        habitatQuality: {
          score: habitatScore,
          weight: Math.round(habitatWeight * 100),
          available: !!hasHabitatData
        },
        speciesDiversity: {
          score: diversityScore,
          weight: Math.round(diversityWeight * 100),
          available: !!hasDiversityData
        },
      },
      confidence,
      dataSourcesAvailable: availableSources,
    };
  }, [
    abundanceSummary,
    abundanceLoading,
    environmentalSummary,
    environmentalLoading,
    trackingSummary,
    trackingLoading,
    indicatorSpeciesCount,
  ]);
}

/**
 * Calculate population health score from abundance trends
 */
function calculatePopulationScore(summary: MPAAbundanceSummary | null): number {
  if (!summary || summary.speciesTrends.length === 0) {
    return 0;
  }

  // Use the pre-calculated health score if available
  if (summary.overallBiodiversity?.healthScore) {
    return summary.overallBiodiversity.healthScore;
  }

  // Fallback: calculate from trend directions
  const trends = summary.speciesTrends;
  const validTrends = trends.filter(t => t.trend !== 'insufficient_data');

  if (validTrends.length === 0) {
    return 50; // Neutral if no valid trends
  }

  const increasing = validTrends.filter(t => t.trend === 'increasing').length;
  const stable = validTrends.filter(t => t.trend === 'stable').length;
  const decreasing = validTrends.filter(t => t.trend === 'decreasing').length;

  // Score: increasing trends are good (100), stable is okay (70), decreasing is concerning (30)
  const score = (
    (increasing * 100) +
    (stable * 70) +
    (decreasing * 30)
  ) / validTrends.length;

  return Math.round(score);
}

/**
 * Calculate habitat quality score from environmental data
 */
function calculateHabitatScore(summary: MPAEnvironmentalSummary | null): number {
  if (!summary || summary.parameters.length === 0) {
    return 0;
  }

  // Use the pre-calculated habitat quality score
  return summary.habitatQualityScore || 50;
}

/**
 * Calculate species diversity score
 */
function calculateDiversityScore(
  indicatorSpeciesCount: number,
  trackingSummary: MPATrackingSummary | null
): number {
  if (indicatorSpeciesCount === 0) {
    return 0;
  }

  // Base score from indicator species count
  // Scale: 0 species = 0, 5+ species = 60, 10+ species = 80, 20+ species = 100
  let diversityScore = Math.min(100, indicatorSpeciesCount * 5);

  // Bonus for tracking data (shows active research/monitoring)
  if (trackingSummary && trackingSummary.trackedIndividuals > 0) {
    diversityScore = Math.min(100, diversityScore + 10);
  }

  return Math.round(diversityScore);
}
