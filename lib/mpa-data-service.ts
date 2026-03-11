import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { MPAAbundanceSummary, AbundanceTrend, AbundanceDataPoint } from '@/types/obis-abundance';
import type { MPAEnvironmentalSummary, EnvironmentalParameter, EnvironmentalAnomaly } from '@/types/obis-environmental';

/**
 * Fetch pre-computed abundance summary from Supabase.
 * Returns null if no pipeline data is available yet.
 */
export async function getAbundanceSummary(mpaId: string): Promise<MPAAbundanceSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();

  // Get the summary
  const { data: summary, error: summaryError } = await supabase
    .from('mpa_abundance_summaries')
    .select('*')
    .eq('mpa_id', mpaId)
    .single();

  if (summaryError || !summary) return null;

  // Get individual species trends
  const { data: trends, error: trendsError } = await supabase
    .from('population_trends')
    .select('*')
    .eq('mpa_id', mpaId);

  if (trendsError) return null;

  // Map to the existing MPAAbundanceSummary type used by frontend
  const speciesTrends: AbundanceTrend[] = (trends || []).map((t: Record<string, unknown>) => ({
    speciesName: (t.common_name as string) || (t.scientific_name as string),
    scientificName: t.scientific_name as string,
    dataPoints: ((t.data_points as Record<string, unknown>[]) || []).map((dp): AbundanceDataPoint => ({
      date: dp.month as string,
      count: dp.count as number,
      recordCount: (dp.record_count as number) || (dp.count as number),
      quality: (dp.quality as 'high' | 'medium' | 'low') || 'medium',
    })),
    trend: t.trend as AbundanceTrend['trend'],
    changePercent: (t.change_percent as number) || 0,
    confidence: t.confidence as AbundanceTrend['confidence'],
  }));

  const trendDirection = (summary as Record<string, unknown>).trend_direction as string;
  const validTrendDirections = ['increasing', 'stable', 'decreasing'] as const;
  const mappedTrendDirection: MPAAbundanceSummary['overallBiodiversity']['trendDirection'] =
    validTrendDirections.includes(trendDirection as typeof validTrendDirections[number])
      ? (trendDirection as typeof validTrendDirections[number])
      : 'stable';

  const summaryRecord = summary as Record<string, unknown>;
  const dataQuality = summaryRecord.data_quality as Record<string, unknown> | undefined;

  return {
    mpaId,
    speciesTrends,
    overallBiodiversity: {
      speciesCount: summaryRecord.species_count as number,
      trendDirection: mappedTrendDirection,
      healthScore: (summaryRecord.health_score as number) || 0,
    },
    dataQuality: {
      recordsWithAbundance: dataQuality?.recordsWithAbundance as number || 0,
      totalRecords: summaryRecord.total_records as number,
      coveragePercent: dataQuality?.speciesWithData
        ? (dataQuality.speciesWithData as number) / ((dataQuality.speciesQueried as number) || 1)
        : 0,
    },
    lastUpdated: summaryRecord.fetched_at as number,
  };
}

/**
 * Fetch pre-computed environmental summary from Supabase.
 * Returns null if no pipeline data is available yet.
 */
export async function getEnvironmentalSummary(mpaId: string): Promise<MPAEnvironmentalSummary | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();

  const { data, error } = await supabase
    .from('environmental_summaries')
    .select('*')
    .eq('mpa_id', mpaId)
    .single();

  if (error || !data) return null;

  const record = data as Record<string, unknown>;

  // Map to existing MPAEnvironmentalSummary type
  const parameters: EnvironmentalParameter[] = ((record.parameters as Record<string, unknown>[]) || []).map((p) => ({
    name: p.name as string,
    type: p.type as EnvironmentalParameter['type'],
    currentValue: p.currentValue as number,
    unit: p.unit as string,
    historicalAvg: p.historicalAvg as number,
    min: p.min as number,
    max: p.max as number,
    trend: (p.trend as EnvironmentalParameter['trend']) || 'stable',
    dataPoints: [],
    threshold: (p.status as string) !== 'normal' ? {
      status: p.status as 'normal' | 'warning' | 'critical',
    } : undefined,
  }));

  const rawAnomalies = (record.anomalies as Record<string, unknown>[]) || [];
  const anomalies: EnvironmentalAnomaly[] = rawAnomalies.map((a) => ({
    parameter: a.parameter as string,
    type: (a.type as EnvironmentalAnomaly['type']) || 'sustained_change',
    severity: a.severity as 'low' | 'medium' | 'high',
    startDate: (a.startDate as string) || (record.fetched_at as string) || '',
    description: (a.description as string) || `Anomaly detected for ${a.parameter as string}`,
  }));

  const dataQuality = record.data_quality as Record<string, unknown> | undefined;

  return {
    mpaId,
    parameters,
    habitatQualityScore: (record.habitat_quality_score as number) || 0,
    anomalies,
    dataQuality: {
      measurementsCount: (dataQuality?.totalMeasurements as number) || 0,
      parametersCount: parameters.length,
      coveragePercent: 0,
    },
    lastUpdated: record.fetched_at as number,
  };
}

/**
 * Check if pipeline data exists for a given MPA.
 * Useful for deciding whether to fall back to client-side fetching.
 */
export async function hasPipelineData(mpaId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = createClient();
  const { count } = await supabase
    .from('mpa_abundance_summaries')
    .select('*', { count: 'exact', head: true })
    .eq('mpa_id', mpaId);

  return (count || 0) > 0;
}
