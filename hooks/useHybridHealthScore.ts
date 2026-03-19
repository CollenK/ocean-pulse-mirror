/**
 * useHybridHealthScore Hook
 * Uses the Python backend for health scores when available,
 * falls back to client-side calculation otherwise
 * Now includes community-contributed health assessments and fishing compliance data
 */

import { useMemo, useState, useEffect } from 'react';
import { useBackendHealthScore } from './useBackendData';
import { getUserHealthScoreForMPA } from '@/lib/offline-storage';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { HealthScoreResponse, EnvironmentalDataResponse } from '@/lib/api/data-service';
import type { MPAAbundanceSummary } from '@/types/obis-abundance';
import type { MPAEnvironmentalSummary } from '@/types/obis-environmental';
import type { GFWComplianceScore } from '@/types/gfw';
import type { MarineHeatwaveAlert, HeatwaveCategory } from '@/hooks/useHeatwaveAlert';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserHealthData { averageScore: number | null; count: number }

interface HybridHealthScoreInput {
  mpaId: string;
  mpaName: string;
  lat: number;
  lon: number;
  abundanceSummary: MPAAbundanceSummary | null;
  abundanceLoading: boolean;
  environmentalSummary: MPAEnvironmentalSummary | null;
  environmentalLoading: boolean;
  indicatorSpeciesCount: number;
  preferBackend?: boolean;
  includeCommunityAssessments?: boolean;
  fishingCompliance?: GFWComplianceScore | null;
  fishingComplianceLoading?: boolean;
  heatwaveAlert?: MarineHeatwaveAlert | null;
  heatwaveLoading?: boolean;
  litterPressureScore?: number | null;
  litterPressureLoading?: boolean;
}

interface HybridHealthScore {
  score: number;
  loading: boolean;
  breakdown: {
    populationTrends: { score: number; weight: number; available: boolean };
    habitatQuality: { score: number; weight: number; available: boolean };
    speciesDiversity: { score: number; weight: number; available: boolean };
    thermalStress?: { score: number; weight: number; available: boolean };
    productivity?: { score: number; weight: number; available: boolean };
    communityAssessment?: { score: number; weight: number; available: boolean; count: number };
    fishingCompliance?: { score: number; weight: number; available: boolean; violations: number };
    litterPressure?: { score: number; weight: number; available: boolean; reportCount: number };
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
  communityData?: { averageScore: number; assessmentCount: number };
  fishingData?: { complianceScore: number; violations: number; fishingHoursInside: number };
}

type Breakdown = HybridHealthScore['breakdown'];

// ---------------------------------------------------------------------------
// Score calculation helpers
// ---------------------------------------------------------------------------

function calculateThermalStressScore(alert: MarineHeatwaveAlert | null): number {
  if (!alert) return 0;
  const baseScores: Record<HeatwaveCategory, number> = { none: 95, moderate: 65, strong: 40, severe: 20, extreme: 5 };
  let score = baseScores[alert.category];
  if (alert.intensity_ratio !== null && alert.intensity_ratio > 0) {
    const r = alert.intensity_ratio;
    const adjustments: Record<string, number> = { none: 95 - r * 10, moderate: 65 - (r - 1) * 15, strong: 40 - (r - 2) * 10, severe: 20 - (r - 3) * 10 };
    if (alert.category in adjustments) score = Math.round(adjustments[alert.category]);
  }
  return Math.max(0, Math.min(100, score));
}

function calculatePopulationScore(summary: MPAAbundanceSummary | null): number {
  if (!summary || summary.speciesTrends.length === 0) return 0;
  if (summary.overallBiodiversity?.healthScore) return summary.overallBiodiversity.healthScore;
  const valid = summary.speciesTrends.filter(t => t.trend !== 'insufficient_data');
  if (valid.length === 0) return 50;
  const inc = valid.filter(t => t.trend === 'increasing').length;
  const stb = valid.filter(t => t.trend === 'stable').length;
  const dec = valid.filter(t => t.trend === 'decreasing').length;
  return Math.round((inc * 100 + stb * 70 + dec * 30) / valid.length);
}

function calculateHabitatScore(summary: MPAEnvironmentalSummary | null): number {
  if (!summary || summary.parameters.length === 0) return 0;
  return summary.habitatQualityScore || 50;
}

function calculateDiversityScore(count: number): number {
  if (count === 0) return 0;
  return Math.round(Math.min(100, count * 5));
}

// ---------------------------------------------------------------------------
// Pure builder helpers
// ---------------------------------------------------------------------------

function mapEnvParam<T extends { value: number; unit: string }>(
  param: T | null,
  extra?: Record<string, unknown>,
): { value: number; unit: string; [k: string]: unknown } | undefined {
  if (!param) return undefined;
  return { value: param.value, unit: param.unit, ...extra };
}

function mapEnvironmentalData(env: EnvironmentalDataResponse | null): HybridHealthScore['environmentalData'] {
  if (!env) return undefined;
  return {
    sst: mapEnvParam(env.sea_surface_temperature, { anomaly: env.sea_surface_temperature?.anomaly }) as HybridHealthScore['environmentalData'] extends undefined ? never : NonNullable<HybridHealthScore['environmentalData']>['sst'],
    chlorophyll: mapEnvParam(env.chlorophyll) as NonNullable<HybridHealthScore['environmentalData']>['chlorophyll'],
    dissolvedOxygen: mapEnvParam(env.dissolved_oxygen) as NonNullable<HybridHealthScore['environmentalData']>['dissolvedOxygen'],
    ph: mapEnvParam(env.ph) as NonNullable<HybridHealthScore['environmentalData']>['ph'],
    salinity: mapEnvParam(env.salinity) as NonNullable<HybridHealthScore['environmentalData']>['salinity'],
  };
}

function blendScore(base: number, additions: Array<{ active: boolean; score: number; weight: number }>): number {
  let result = base;
  for (const a of additions) {
    if (a.active) result = result * (1 - a.weight) + a.score * a.weight;
  }
  return Math.round(result);
}

function countAvailable(breakdown: Breakdown): number {
  return [
    breakdown.populationTrends.available,
    breakdown.habitatQuality.available,
    breakdown.speciesDiversity.available,
    breakdown.thermalStress?.available,
    breakdown.productivity?.available,
    breakdown.communityAssessment?.available,
    breakdown.fishingCompliance?.available,
    breakdown.litterPressure?.available,
  ].filter(Boolean).length;
}

function makeCommunityResult(data: UserHealthData): HybridHealthScore['communityData'] | undefined {
  if (data.averageScore === null || data.count <= 0) return undefined;
  return { averageScore: data.averageScore, assessmentCount: data.count };
}

function makeFishingResult(fc: GFWComplianceScore | null): HybridHealthScore['fishingData'] | undefined {
  if (!fc) return undefined;
  return { complianceScore: fc.score, violations: fc.violations, fishingHoursInside: fc.fishingHoursInside };
}

function safeScore(val: number | undefined): number { return val ?? 0; }

function buildBackendCoreBreakdown(backendData: HealthScoreResponse): Breakdown {
  const { components, environmental_data, species_data } = backendData;
  const hasSpecies = (species_data?.total_species ?? 0) > 0;
  return {
    populationTrends: { score: safeScore(components.biodiversity), weight: 30, available: hasSpecies },
    habitatQuality: { score: safeScore(components.water_quality), weight: 25, available: !!environmental_data },
    speciesDiversity: { score: safeScore(species_data?.biodiversity_index), weight: 20, available: hasSpecies },
    thermalStress: { score: 100 - safeScore(components.thermal_stress), weight: 15, available: !!environmental_data?.sea_surface_temperature },
    productivity: { score: safeScore(components.productivity), weight: 10, available: !!environmental_data?.chlorophyll },
  };
}

function attachOptionalBreakdown(
  breakdown: Breakdown, communityData: UserHealthData,
  fishingCompliance: GFWComplianceScore | null, litterPressureScore: number | null,
): Breakdown {
  const hasCommunity = communityData.averageScore !== null && communityData.count > 0;
  if (hasCommunity) {
    breakdown.communityAssessment = { score: (communityData.averageScore! / 10) * 100, weight: 10, available: true, count: communityData.count };
  }
  if (fishingCompliance) {
    breakdown.fishingCompliance = { score: fishingCompliance.score, weight: 10, available: true, violations: fishingCompliance.violations };
  }
  if (litterPressureScore !== null && litterPressureScore > 0) {
    breakdown.litterPressure = { score: litterPressureScore, weight: 10, available: true, reportCount: 0 };
  }
  return breakdown;
}

function buildBackendHealthScore(
  backendData: HealthScoreResponse,
  communityData: UserHealthData,
  fishingCompliance: GFWComplianceScore | null,
  litterPressureScore: number | null,
  loading: boolean,
): HybridHealthScore {
  const hasCommunity = communityData.averageScore !== null && communityData.count > 0;
  const communityNorm = hasCommunity ? (communityData.averageScore! / 10) * 100 : 0;
  const breakdown = attachOptionalBreakdown(buildBackendCoreBreakdown(backendData), communityData, fishingCompliance, litterPressureScore);

  const score = blendScore(backendData.overall_score, [
    { active: hasCommunity, score: communityNorm, weight: 0.1 },
    { active: fishingCompliance !== null, score: fishingCompliance?.score ?? 0, weight: 0.1 },
    { active: litterPressureScore !== null && litterPressureScore! > 0, score: litterPressureScore ?? 0, weight: 0.1 },
  ]);

  return {
    score, loading, breakdown,
    confidence: backendData.confidence as 'high' | 'medium' | 'low',
    dataSourcesAvailable: countAvailable(breakdown),
    source: 'backend', backendAvailable: true,
    environmentalData: mapEnvironmentalData(backendData.environmental_data),
    communityData: makeCommunityResult(communityData),
    fishingData: makeFishingResult(fishingCompliance),
  };
}

interface ScoreSet { population: number; habitat: number; diversity: number; thermal: number; community: number; fishing: number; litter: number }

function redistributeWeights(available: ScoreSet): ScoreSet {
  const base: Array<[keyof ScoreSet, number]> = [['population', 0.25], ['habitat', 0.20], ['diversity', 0.15], ['thermal', 0.15]];
  const fixed: Array<[keyof ScoreSet, number]> = [['community', 0.10], ['fishing', 0.15], ['litter', 0.10]];

  const fixedTotal = fixed.reduce((s, [k, w]) => s + (available[k] > 0 ? w : 0), 0);
  const dataTotal = base.reduce((s, [k, w]) => s + (available[k] > 0 ? w : 0), 0);
  const target = 1 - fixedTotal;
  const scale = dataTotal > 0 ? target / dataTotal : 0;

  const weights: ScoreSet = { population: 0, habitat: 0, diversity: 0, thermal: 0, community: 0, fishing: 0, litter: 0 };
  for (const [k, w] of base) weights[k] = available[k] > 0 ? w * scale : 0;
  for (const [k, w] of fixed) weights[k] = available[k] > 0 ? w : 0;
  return weights;
}

function calculateWeightedScore(scores: ScoreSet, avail: Record<keyof ScoreSet, boolean>): { score: number; weights: ScoreSet } {
  const availNum: ScoreSet = { population: 0, habitat: 0, diversity: 0, thermal: 0, community: 0, fishing: 0, litter: 0 };
  for (const k of Object.keys(availNum) as Array<keyof ScoreSet>) availNum[k] = avail[k] ? 1 : 0;
  const weights = redistributeWeights(availNum);
  let composite = 0;
  for (const k of Object.keys(scores) as Array<keyof ScoreSet>) {
    if (avail[k]) composite += scores[k] * weights[k];
  }
  return { score: Math.min(100, Math.max(0, Math.round(composite))), weights };
}

function buildBreakdown(scores: ScoreSet, weights: ScoreSet, avail: Record<keyof ScoreSet, boolean>, communityCount: number, violations: number): Breakdown {
  return {
    populationTrends: { score: scores.population, weight: Math.round(weights.population * 100), available: avail.population },
    habitatQuality: { score: scores.habitat, weight: Math.round(weights.habitat * 100), available: avail.habitat },
    speciesDiversity: { score: scores.diversity, weight: Math.round(weights.diversity * 100), available: avail.diversity },
    thermalStress: { score: scores.thermal, weight: Math.round(weights.thermal * 100), available: avail.thermal },
    communityAssessment: { score: scores.community, weight: Math.round(weights.community * 100), available: avail.community, count: communityCount },
    fishingCompliance: { score: scores.fishing, weight: Math.round(weights.fishing * 100), available: avail.fishing, violations },
    litterPressure: { score: scores.litter, weight: Math.round(weights.litter * 100), available: avail.litter, reportCount: 0 },
  };
}

interface ClientScoreInput {
  abundanceSummary: MPAAbundanceSummary | null;
  environmentalSummary: MPAEnvironmentalSummary | null;
  indicatorSpeciesCount: number;
  communityData: UserHealthData;
  fishingCompliance: GFWComplianceScore | null;
  heatwaveAlert: MarineHeatwaveAlert | null;
  litterPressureScore: number | null;
  loading: boolean;
}

type AvailFlags = Record<keyof ScoreSet, boolean>;

function computeClientScores(input: ClientScoreInput): { scores: ScoreSet; avail: AvailFlags } {
  const { abundanceSummary, environmentalSummary, indicatorSpeciesCount, communityData, fishingCompliance, heatwaveAlert, litterPressureScore } = input;
  const hasCommunity = communityData.averageScore !== null && communityData.count > 0;
  const hasLitter = litterPressureScore !== null && litterPressureScore > 0;
  return {
    scores: {
      population: calculatePopulationScore(abundanceSummary),
      habitat: calculateHabitatScore(environmentalSummary),
      diversity: calculateDiversityScore(indicatorSpeciesCount),
      thermal: calculateThermalStressScore(heatwaveAlert),
      community: hasCommunity ? (communityData.averageScore! / 10) * 100 : 0,
      fishing: fishingCompliance?.score ?? 0,
      litter: hasLitter ? litterPressureScore! : 0,
    },
    avail: {
      population: !!(abundanceSummary && abundanceSummary.speciesTrends.length > 0),
      habitat: !!(environmentalSummary && environmentalSummary.parameters.length > 0),
      diversity: indicatorSpeciesCount > 0,
      thermal: heatwaveAlert !== null,
      community: hasCommunity,
      fishing: fishingCompliance !== null,
      litter: hasLitter,
    },
  };
}

const ZERO_SCORES: ScoreSet = { population: 0, habitat: 0, diversity: 0, thermal: 0, community: 0, fishing: 0, litter: 0 };
const ZERO_AVAIL: AvailFlags = { population: false, habitat: false, diversity: false, thermal: false, community: false, fishing: false, litter: false };
const DEFAULT_W: ScoreSet = { population: 0.25, habitat: 0.20, diversity: 0.15, thermal: 0.15, community: 0.10, fishing: 0.15, litter: 0.10 };

function buildClientHealthScore(input: ClientScoreInput): HybridHealthScore {
  const { communityData, fishingCompliance, loading } = input;
  const { scores, avail } = computeClientScores(input);
  const availCount = Object.values(avail).filter(Boolean).length;

  if (availCount === 0) {
    return { score: 0, loading, breakdown: buildBreakdown(ZERO_SCORES, DEFAULT_W, ZERO_AVAIL, 0, 0), confidence: 'low', dataSourcesAvailable: 0, source: 'client', backendAvailable: false };
  }

  const { score, weights } = calculateWeightedScore(scores, avail);
  const confidence: HybridHealthScore['confidence'] = availCount >= 4 ? 'high' : availCount >= 2 ? 'medium' : 'low';

  return {
    score, loading,
    breakdown: buildBreakdown(scores, weights, avail, communityData.count, fishingCompliance?.violations ?? 0),
    confidence, dataSourcesAvailable: availCount,
    source: 'client', backendAvailable: false,
    communityData: makeCommunityResult(communityData),
    fishingData: makeFishingResult(fishingCompliance),
  };
}

// ---------------------------------------------------------------------------
// Community assessment fetcher (extracted from hook to reduce function length)
// ---------------------------------------------------------------------------

async function fetchVerifiedAssessments(mpaId: string): Promise<UserHealthData> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('user_health_assessments') as any)
        .select('score, observation_id, observations!inner(quality_tier)')
        .eq('mpa_id', mpaId)
        .in('observations.quality_tier', ['community_verified', 'research_grade']);

      if (!error && data && data.length > 0) {
        const total = data.reduce((sum: number, row: { score: number }) => sum + row.score, 0);
        return { averageScore: total / data.length, count: data.length };
      }
    } catch {
      // Fall back to local storage
    }
  }
  const local = await getUserHealthScoreForMPA(mpaId);
  return { averageScore: local.averageScore, count: local.count };
}

// ---------------------------------------------------------------------------
// Main hook
// ---------------------------------------------------------------------------

/**
 * Hybrid health score hook that tries backend first, falls back to client-side.
 * Optionally includes community-contributed health assessments.
 */
export function useHybridHealthScore({
  mpaId, mpaName, lat, lon,
  abundanceSummary, abundanceLoading,
  environmentalSummary, environmentalLoading,
  indicatorSpeciesCount, preferBackend = true,
  includeCommunityAssessments = true,
  fishingCompliance = null, fishingComplianceLoading = false,
  heatwaveAlert = null, heatwaveLoading = false,
  litterPressureScore = null, litterPressureLoading = false,
}: HybridHealthScoreInput): HybridHealthScore {
  const [communityData, setCommunityData] = useState<UserHealthData>({ averageScore: null, count: 0 });
  const [communityLoading, setCommunityLoading] = useState(true);

  useEffect(() => {
    if (!mpaId || !includeCommunityAssessments) { setCommunityLoading(false); return; }
    setCommunityLoading(true);
    fetchVerifiedAssessments(mpaId)
      .then(setCommunityData)
      .catch(err => console.error('Failed to fetch community health assessments:', err))
      .finally(() => setCommunityLoading(false));
  }, [mpaId, includeCommunityAssessments]);

  const backendParams = preferBackend && mpaId ? { mpaId, name: mpaName, lat, lon } : null;
  const { data: backendData, isLoading: backendLoading, isError: backendError } = useBackendHealthScore(backendParams, { retry: 1, retryDelay: 1000 });

  return useMemo(() => {
    const clientLoading = abundanceLoading || environmentalLoading;
    const allLoading = (preferBackend ? backendLoading && clientLoading : clientLoading)
      || communityLoading || fishingComplianceLoading || heatwaveLoading || litterPressureLoading;

    if (!backendError && backendData) {
      return buildBackendHealthScore(backendData, communityData, fishingCompliance, litterPressureScore,
        backendLoading || communityLoading || fishingComplianceLoading || litterPressureLoading);
    }
    return buildClientHealthScore({
      abundanceSummary, environmentalSummary, indicatorSpeciesCount,
      communityData, fishingCompliance, heatwaveAlert, litterPressureScore, loading: allLoading,
    });
  }, [
    backendData, backendLoading, backendError, preferBackend,
    abundanceSummary, abundanceLoading, environmentalSummary, environmentalLoading,
    indicatorSpeciesCount, communityData, communityLoading,
    fishingCompliance, fishingComplianceLoading, heatwaveAlert, heatwaveLoading,
    litterPressureScore, litterPressureLoading,
  ]);
}
