/**
 * Litter Analytics Service
 *
 * Aggregates marine litter observation data per MPA for source attribution,
 * material breakdown, trend analysis, and health score integration.
 *
 * Used by the MPA detail page's Litter Pressure dashboard (Phase 2).
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { captureError } from '@/lib/error-reporting';
import type { LitterMaterial, LitterSource, LitterTallyEntry } from '@/types/marine-litter';
import { OSPAR_LITTER_ITEMS } from '@/types/marine-litter';

// ----- Types -----

export interface LitterSourceBreakdown {
  source: LitterSource;
  count: number;
  percentage: number;
}

export interface LitterMaterialBreakdown {
  material: LitterMaterial;
  count: number;
  percentage: number;
}

export interface LitterMonthlyTrend {
  month: string;       // YYYY-MM
  totalItems: number;
  itemsPer100m: number | null;
  reportCount: number;
  totalWeightKg: number | null;
}

export interface LitterAnalytics {
  totalReports: number;
  totalItems: number;
  totalWeightKg: number | null;
  averageItemsPer100m: number | null;
  surveyCount: number;       // OSPAR surveys only
  sourceBreakdown: LitterSourceBreakdown[];
  materialBreakdown: LitterMaterialBreakdown[];
  monthlyTrend: LitterMonthlyTrend[];
  topItems: { code: string; name: string; count: number; material: LitterMaterial }[];
  cleanlinessRating: 'clean' | 'moderate' | 'dirty' | 'very_dirty' | null;
  // For health score integration
  pressureScore: number;     // 0-100, higher = cleaner (less pressure)
}

/**
 * Build a lookup from OSPAR J-code to its source attribution.
 */
const SOURCE_LOOKUP: Record<string, LitterSource> = {};
for (const item of OSPAR_LITTER_ITEMS) {
  SOURCE_LOOKUP[item.code] = item.source;
}

/**
 * Get the source attribution for a litter item by code.
 * Falls back to 'unknown' if the code isn't in the OSPAR catalog.
 */
function getSourceForCode(code: string): LitterSource {
  return SOURCE_LOOKUP[code] || 'unknown';
}

/**
 * Classify average items/100m into a MSFD Descriptor 10 cleanliness rating.
 */
function getCleanlinessRating(itemsPer100m: number): 'clean' | 'moderate' | 'dirty' | 'very_dirty' {
  if (itemsPer100m <= 20) return 'clean';
  if (itemsPer100m <= 100) return 'moderate';
  if (itemsPer100m <= 500) return 'dirty';
  return 'very_dirty';
}

/**
 * Convert average items/100m to a 0-100 pressure score.
 * Higher score = healthier (less litter pressure).
 * Uses MSFD Descriptor 10 thresholds for calibration.
 *
 * 0 items/100m   -> 100 (pristine)
 * 20 items/100m  -> 80  (MSFD "clean" threshold)
 * 100 items/100m -> 50  (moderate)
 * 500 items/100m -> 20  (dirty)
 * 1000+ items/100m -> 5 (very dirty)
 */
function calculatePressureScore(avgItemsPer100m: number | null): number {
  if (avgItemsPer100m === null) return 0;
  if (avgItemsPer100m <= 0) return 100;
  if (avgItemsPer100m <= 20) return Math.round(100 - (avgItemsPer100m / 20) * 20);
  if (avgItemsPer100m <= 100) return Math.round(80 - ((avgItemsPer100m - 20) / 80) * 30);
  if (avgItemsPer100m <= 500) return Math.round(50 - ((avgItemsPer100m - 100) / 400) * 30);
  if (avgItemsPer100m <= 1000) return Math.round(20 - ((avgItemsPer100m - 500) / 500) * 15);
  return 5;
}

interface EnrichedEntry extends LitterTallyEntry {
  source: LitterSource;
}

interface AggregatedData {
  totalItems: number;
  totalWeightKg: number;
  hasWeight: boolean;
  surveyCount: number;
  allEntries: EnrichedEntry[];
  monthlyMap: Record<string, { totalItems: number; itemsPer100m: number[]; reportCount: number; weight: number; hasWeight: boolean }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aggregateObservations(observations: any[]): AggregatedData {
  let totalItems = 0;
  let totalWeightKg = 0;
  let hasWeight = false;
  let surveyCount = 0;
  const allEntries: EnrichedEntry[] = [];
  const monthlyMap: AggregatedData['monthlyMap'] = {};

  for (const obs of observations) {
    const items: LitterTallyEntry[] = parseLitterItems(obs.litter_items);
    const obsTotal = items.reduce((sum, e) => sum + e.count, 0);
    totalItems += obsTotal;

    if (obs.litter_weight_kg != null) {
      totalWeightKg += Number(obs.litter_weight_kg);
      hasWeight = true;
    }

    const isSurvey = obs.survey_length_m != null && obs.survey_length_m > 0;
    if (isSurvey) surveyCount++;

    for (const entry of items) {
      allEntries.push({ ...entry, source: getSourceForCode(entry.code) });
    }

    const month = obs.observed_at.slice(0, 7);
    if (!monthlyMap[month]) {
      monthlyMap[month] = { totalItems: 0, itemsPer100m: [], reportCount: 0, weight: 0, hasWeight: false };
    }
    monthlyMap[month].totalItems += obsTotal;
    monthlyMap[month].reportCount += 1;
    if (isSurvey && obsTotal > 0) {
      monthlyMap[month].itemsPer100m.push((obsTotal / obs.survey_length_m) * 100);
    }
    if (obs.litter_weight_kg != null) {
      monthlyMap[month].weight += Number(obs.litter_weight_kg);
      monthlyMap[month].hasWeight = true;
    }
  }

  return { totalItems, totalWeightKg, hasWeight, surveyCount, allEntries, monthlyMap };
}

function buildBreakdowns(allEntries: EnrichedEntry[], totalItems: number) {
  const sourceCounts: Record<string, number> = {};
  const materialCounts: Record<string, number> = {};
  for (const e of allEntries) {
    sourceCounts[e.source] = (sourceCounts[e.source] || 0) + e.count;
    materialCounts[e.material] = (materialCounts[e.material] || 0) + e.count;
  }

  const sourceBreakdown: LitterSourceBreakdown[] = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source: source as LitterSource,
      count,
      percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const materialBreakdown: LitterMaterialBreakdown[] = Object.entries(materialCounts)
    .map(([material, count]) => ({
      material: material as LitterMaterial,
      count,
      percentage: totalItems > 0 ? (count / totalItems) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { sourceBreakdown, materialBreakdown };
}

function buildTopItems(allEntries: EnrichedEntry[]) {
  const itemCounts: Record<string, { name: string; count: number; material: LitterMaterial }> = {};
  for (const e of allEntries) {
    if (!itemCounts[e.code]) itemCounts[e.code] = { name: e.name, count: 0, material: e.material };
    itemCounts[e.code].count += e.count;
  }
  return Object.entries(itemCounts)
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function buildMonthlyTrend(monthlyMap: AggregatedData['monthlyMap']): LitterMonthlyTrend[] {
  return Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      totalItems: data.totalItems,
      itemsPer100m: data.itemsPer100m.length > 0
        ? Math.round(data.itemsPer100m.reduce((s, v) => s + v, 0) / data.itemsPer100m.length)
        : null,
      reportCount: data.reportCount,
      totalWeightKg: data.hasWeight ? data.weight : null,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateAverageItemsPer100m(observations: any[]): number | null {
  const surveyDensities: number[] = [];
  for (const obs of observations) {
    if (obs.survey_length_m && obs.survey_length_m > 0) {
      const items = parseLitterItems(obs.litter_items);
      const obsTotal = items.reduce((sum, e: LitterTallyEntry) => sum + e.count, 0);
      surveyDensities.push((obsTotal / obs.survey_length_m) * 100);
    }
  }
  return surveyDensities.length > 0
    ? Math.round(surveyDensities.reduce((s, v) => s + v, 0) / surveyDensities.length)
    : null;
}

/**
 * Fetch and aggregate litter analytics for a specific MPA.
 */
export async function getLitterAnalytics(mpaId: string): Promise<LitterAnalytics | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();

    const { data: observations, error } = await (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('observations') as any)
      .select('id, litter_items, litter_weight_kg, survey_length_m, observed_at')
      .eq('mpa_id', mpaId)
      .eq('report_type', 'marine_litter')
      .eq('is_draft', false)
      .order('observed_at', { ascending: true });

    if (error) {
      captureError(error, { context: 'getLitterAnalytics', mpaId });
      return null;
    }

    if (!observations || observations.length === 0) return null;

    const agg = aggregateObservations(observations);
    const { sourceBreakdown, materialBreakdown } = buildBreakdowns(agg.allEntries, agg.totalItems);
    const monthlyTrend = buildMonthlyTrend(agg.monthlyMap);
    const topItems = buildTopItems(agg.allEntries);
    const averageItemsPer100m = calculateAverageItemsPer100m(observations);
    const pressureScore = calculatePressureScore(averageItemsPer100m);

    return {
      totalReports: observations.length,
      totalItems: agg.totalItems,
      totalWeightKg: agg.hasWeight ? Math.round(agg.totalWeightKg * 100) / 100 : null,
      averageItemsPer100m,
      surveyCount: agg.surveyCount,
      sourceBreakdown,
      materialBreakdown,
      monthlyTrend,
      topItems,
      cleanlinessRating: averageItemsPer100m !== null ? getCleanlinessRating(averageItemsPer100m) : null,
      pressureScore,
    };
  } catch (error) {
    captureError(error, { context: 'getLitterAnalytics', mpaId });
    return null;
  }
}

/**
 * Parse litter_items from a raw JSONB column into typed entries.
 */
function parseLitterItems(raw: unknown): LitterTallyEntry[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
