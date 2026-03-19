/**
 * GFW Compliance & IUU Risk Assessment
 *
 * Calculates fishing compliance scores and IUU (Illegal, Unreported, Unregulated)
 * risk assessments for Marine Protected Areas using Global Fishing Watch data.
 */

import type {
  GFWFishingEffortSummary,
  GFWComplianceScore,
  GFWIUURiskAssessment,
  GFWRegion,
} from '@/types/gfw';

import { GFW_DATASETS } from '@/types/gfw';

import { getFishingEffortReport, getFishingEffortForMPA } from '@/lib/gfw-client';

// ============================================================================
// IUU Risk Assessment
// ============================================================================

/**
 * Build IUU risk factors from fishing effort patterns.
 */
function buildIUURiskFactors(
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment['factors'] {
  const factors: GFWIUURiskAssessment['factors'] = [];
  const totalHours = fishingEffort.totalFishingHours;

  if (totalHours > 1000) {
    factors.push({
      type: 'high_fishing_activity',
      description: 'High fishing activity detected in MPA',
      count: Math.round(totalHours),
      severity: totalHours > 5000 ? 'high' : 'medium',
    });
  }

  if (fishingEffort.byFlag.length > 5) {
    factors.push({
      type: 'multiple_flags',
      description: 'Vessels from multiple flag states',
      count: fishingEffort.byFlag.length,
      severity: fishingEffort.byFlag.length > 10 ? 'high' : 'medium',
    });
  }

  return factors;
}

/**
 * Compute a numeric risk score (0-100) from fishing effort metrics.
 */
function computeRiskScore(fishingEffort: GFWFishingEffortSummary): number {
  const totalHours = fishingEffort.totalFishingHours;
  if (totalHours <= 0) return 0;

  let score = Math.min(50, totalHours / 100);
  score += Math.min(30, fishingEffort.byFlag.length * 3);
  score += Math.min(20, fishingEffort.totalVessels);
  return Math.min(100, Math.round(score));
}

/**
 * Map a numeric risk score to a categorical risk level.
 */
function riskLevelFromScore(score: number): GFWIUURiskAssessment['riskLevel'] {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'moderate';
  return 'low';
}

/**
 * Calculate IUU risk assessment from pre-fetched fishing effort data.
 * This avoids making additional API calls when we already have the data.
 */
export function calculateIUURiskFromFishingEffort(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment {
  const factors = buildIUURiskFactors(fishingEffort);
  const riskScore = computeRiskScore(fishingEffort);

  return {
    mpaId,
    riskLevel: riskLevelFromScore(riskScore),
    riskScore,
    factors,
    vesselCount: fishingEffort.totalVessels,
    highRiskVesselCount: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate IUU risk assessment for an MPA based on fishing effort data.
 * Uses fishing effort as a proxy since the Events API requires vessel IDs.
 */
export async function getIUURiskForMPA(
  mpaId: string,
  geometry: GFWRegion,
  _days: number = 90
): Promise<GFWIUURiskAssessment> {
  try {
    const fishingEffort = await getFishingEffortForMPA(mpaId, geometry);
    return calculateIUURiskFromFishingEffort(mpaId, fishingEffort);
  } catch (error) {
    console.error('[GFW] Error calculating IUU risk:', error);
    return {
      mpaId,
      riskLevel: 'low',
      riskScore: 0,
      factors: [],
      vesselCount: 0,
      highRiskVesselCount: 0,
      lastUpdated: Date.now(),
    };
  }
}

// ============================================================================
// Compliance Score Calculation
// ============================================================================

/**
 * Aggregate monthly entries into per-month fishing hour totals, sorted chronologically.
 */
function aggregateMonthlyTrend(
  entries: { date?: string; hours: number }[]
): { month: string; fishingHours: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.date) continue;
    const month = e.date.substring(0, 7);
    map.set(month, (map.get(month) || 0) + e.hours);
  }
  return Array.from(map.entries())
    .map(([month, fishingHours]) => ({ month, fishingHours }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Determine the trend direction from monthly fishing hour data.
 */
function determineTrend(
  monthlyTrend: { month: string; fishingHours: number }[]
): GFWComplianceScore['trend'] {
  if (monthlyTrend.length < 6) return 'stable';

  const recentMonths = monthlyTrend.slice(-3);
  const earlierMonths = monthlyTrend.slice(-6, -3);

  const recentAvg = recentMonths.reduce((sum, m) => sum + m.fishingHours, 0) / recentMonths.length;
  const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.fishingHours, 0) / earlierMonths.length;

  if (earlierAvg <= 0) return 'stable';

  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  if (change < -20) return 'improving';
  if (change > 20) return 'declining';
  return 'stable';
}

/**
 * Compute compliance score and violation count based on protection level.
 */
function computeComplianceMetrics(
  protectionLevel: string,
  totalFishingHours: number,
  totalVessels: number
): { score: number; violations: number } {
  const level = protectionLevel.toLowerCase();
  const isNoTake = level.includes('no-take') || level.includes('no take') || level.includes('strict');

  if (isNoTake) {
    return {
      violations: totalVessels,
      score: totalFishingHours === 0 ? 100 : Math.max(0, 100 - (totalFishingHours * 0.5)),
    };
  }

  const intensityRatio = Math.min(1, totalFishingHours / 1000);
  return {
    score: Math.max(0, 100 - (intensityRatio * 50)),
    violations: Math.floor(totalFishingHours / 500),
  };
}

/**
 * Calculate fishing compliance score for an MPA.
 * Uses a single API call to reduce rate limiting.
 */
export async function calculateComplianceScore(
  mpaId: string,
  geometry: GFWRegion,
  protectionLevel: string,
  establishedYear?: number
): Promise<GFWComplianceScore> {
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const dateRangeStr = `${oneYearAgo.toISOString().split('T')[0]},${now.toISOString().split('T')[0]}`;

  console.log('[GFW] Calculating compliance score for MPA:', mpaId);
  const monthlyResponse = await getFishingEffortReport({
    datasets: [GFW_DATASETS.FISHING_EFFORT],
    dateRange: dateRangeStr,
    spatialResolution: 'LOW',
    temporalResolution: 'MONTHLY',
    region: geometry,
  });

  const totalFishingHours = monthlyResponse.entries.reduce((sum, e) => sum + (e.hours || 0), 0);
  const uniqueVessels = new Set(monthlyResponse.entries.map(e => e.vesselId).filter(Boolean));
  const totalVessels = uniqueVessels.size || Math.ceil(totalFishingHours / 100);

  const { score, violations } = computeComplianceMetrics(protectionLevel, totalFishingHours, totalVessels);

  const monthlyTrend = aggregateMonthlyTrend(monthlyResponse.entries);
  const trend = determineTrend(monthlyTrend);

  let protectionEffectiveness = 0;
  if (establishedYear) {
    const yearsProtected = new Date().getFullYear() - establishedYear;
    protectionEffectiveness = Math.min(75, 25 + (yearsProtected * 5));
  }

  const confidence: GFWComplianceScore['confidence'] =
    monthlyTrend.length >= 12 ? 'high' :
    monthlyTrend.length >= 6 ? 'medium' : 'low';

  return {
    mpaId,
    score: Math.round(score),
    fishingHoursInside: totalFishingHours,
    fishingHoursBuffer: 0,
    violations,
    trend,
    confidence,
    protectionEffectiveness,
    lastUpdated: Date.now(),
  };
}
