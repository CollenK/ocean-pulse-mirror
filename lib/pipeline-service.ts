import { createClient } from '@supabase/supabase-js';

const OBIS_API_BASE = 'https://api.obis.org/v3';

// Use service role client for pipeline writes
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role credentials');
  return createClient(url, key);
}

interface PipelineMPA {
  external_id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  area_km2: number;
  description: string | null;
}

/** Fetch all MPAs that need pipeline processing */
export async function getMPAsForPipeline(batchSize: number = 5): Promise<PipelineMPA[]> {
  const supabase = getServiceClient();

  // Get MPAs whose data is oldest (or never fetched)
  // Left join with mpa_abundance_summaries to find stale/missing data
  const { data: mpas, error } = await supabase
    .from('mpas')
    .select('external_id, name, center_lat, center_lon, area_km2, description')
    .not('external_id', 'is', null)
    .limit(200);

  if (error) throw error;
  if (!mpas || mpas.length === 0) return [];

  // Get last fetched times for all MPAs
  const { data: summaries } = await supabase
    .from('mpa_abundance_summaries')
    .select('mpa_id, fetched_at');

  const fetchedMap = new Map<string, string>();
  summaries?.forEach((s: { mpa_id: string; fetched_at: string }) => {
    fetchedMap.set(s.mpa_id, s.fetched_at);
  });

  // Sort: never-fetched first, then oldest fetched_at
  const sorted = mpas.sort((a: PipelineMPA, b: PipelineMPA) => {
    const aTime = fetchedMap.get(a.external_id);
    const bTime = fetchedMap.get(b.external_id);
    if (!aTime && !bTime) return 0;
    if (!aTime) return -1;
    if (!bTime) return 1;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  // Only process MPAs not updated in the last 24 hours
  const staleThreshold = Date.now() - 24 * 60 * 60 * 1000;
  const stale = sorted.filter((mpa: PipelineMPA) => {
    const fetchedAt = fetchedMap.get(mpa.external_id);
    return !fetchedAt || new Date(fetchedAt).getTime() < staleThreshold;
  });

  return stale.slice(0, batchSize);
}

/** Calculate search radius based on MPA area */
function getSearchRadius(areaKm2: number): number {
  return Math.min(Math.max(Math.round(Math.sqrt(areaKm2 / Math.PI)), 50), 300);
}

/** Fetch OBIS occurrence data for abundance analysis */
async function fetchOBISAbundance(
  lat: number,
  lon: number,
  radiusKm: number,
  scientificName: string
): Promise<{ month: string; count: number }[]> {
  const radiusM = radiusKm * 1000;
  const url = `${OBIS_API_BASE}/occurrence?scientificname=${encodeURIComponent(scientificName)}&geometry=CIRCLE(${lon} ${lat},${radiusM})&fields=eventDate,individualCount,occurrenceStatus&size=1000`;

  const response = await fetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  const records = data.results || [];

  // Aggregate by month
  const monthlyData = new Map<string, number>();
  for (const record of records) {
    if (!record.eventDate) continue;
    const month = record.eventDate.substring(0, 7); // YYYY-MM
    const count = record.individualCount || 1;
    monthlyData.set(month, (monthlyData.get(month) || 0) + count);
  }

  return Array.from(monthlyData.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Calculate trend from monthly data points using linear regression */
function calculateTrend(dataPoints: { month: string; count: number }[]): {
  trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  changePercent: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (dataPoints.length < 3) {
    return { trend: 'insufficient_data', changePercent: 0, confidence: 'low' };
  }

  const n = dataPoints.length;
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map((d) => d.count);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
  const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  const changePercent = avgY > 0 ? (slope * n / avgY) * 100 : 0;

  const months = n;
  const confidence = months >= 24 ? 'high' : months >= 12 ? 'medium' : 'low';

  let trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  if (Math.abs(changePercent) < 5) {
    trend = 'stable';
  } else if (changePercent > 0) {
    trend = 'increasing';
  } else {
    trend = 'decreasing';
  }

  return { trend, changePercent: Math.round(changePercent * 10) / 10, confidence };
}

// Common indicator species to query per ecosystem
const INDICATOR_SPECIES: Record<string, string[]> = {
  tropical: ['Acropora', 'Porites', 'Chelonia mydas', 'Delphinidae', 'Lutjanidae', 'Scaridae'],
  temperate: ['Laminaria', 'Zostera', 'Gadus morhua', 'Halichoerus grypus', 'Phocoena phocoena', 'Homarus'],
  polar: ['Euphausia superba', 'Pygoscelis', 'Leptonychotes weddellii', 'Dissostichus'],
  deep_sea: ['Lophelia pertusa', 'Bathymodiolus', 'Coryphaenoides'],
  default: ['Tursiops', 'Chelonia', 'Carcharhinus', 'Epinephelus', 'Posidonia', 'Zostera'],
};

/** Determine ecosystem type from MPA info */
function getEcosystem(lat: number, description: string | null): string {
  const absLat = Math.abs(lat);
  if (absLat > 60) return 'polar';
  if (absLat < 23.5) return 'tropical';
  const desc = (description || '').toLowerCase();
  if (desc.includes('deep') || desc.includes('abyssal') || desc.includes('seamount')) return 'deep_sea';
  return 'temperate';
}

/** Fetch OBIS eMoF (extended measurement or fact) data for environmental analysis */
async function fetchOBISEnvironmental(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<{
  parameters: Record<string, { values: number[]; unit: string }>;
}> {
  const radiusM = radiusKm * 1000;
  const url = `${OBIS_API_BASE}/occurrence?geometry=CIRCLE(${lon} ${lat},${radiusM})&mof=true&fields=eventDate,decimalLatitude,decimalLongitude&size=500`;

  const response = await fetch(url);
  if (!response.ok) return { parameters: {} };

  const data = await response.json();
  const records = data.results || [];

  const parameters: Record<string, { values: number[]; unit: string }> = {};

  const MEASUREMENT_TYPES: Record<string, { key: string; unit: string }> = {
    'temperature': { key: 'temperature', unit: '\u00B0C' },
    'salinity': { key: 'salinity', unit: 'PSU' },
    'depth': { key: 'depth', unit: 'm' },
    'ph': { key: 'pH', unit: '' },
    'oxygen': { key: 'oxygen', unit: 'ml/l' },
    'chlorophyll': { key: 'chlorophyll', unit: 'mg/m\u00B3' },
  };

  // Flatten all MOF entries from all records
  const mofEntries = records.flatMap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (record: any) => (record.mof || []).map((mof: any) => mof)
  );

  for (const mof of mofEntries) {
    const typeLC = (mof.measurementType || '').toLowerCase();
    const matched = Object.entries(MEASUREMENT_TYPES).find(([keyword]) => typeLC.includes(keyword));
    if (!matched) continue;

    const [, info] = matched;
    const val = parseFloat(mof.measurementValue);
    if (isNaN(val)) continue;

    if (!parameters[info.key]) {
      parameters[info.key] = { values: [], unit: info.unit };
    }
    parameters[info.key].values.push(val);
  }

  return { parameters };
}

const ENV_THRESHOLDS: Record<string, { min: number; max: number }> = {
  temperature: { min: -2, max: 35 },
  salinity: { min: 0, max: 45 },
  pH: { min: 7.5, max: 8.5 },
  oxygen: { min: 2, max: 10 },
  chlorophyll: { min: 0, max: 30 },
};

function classifyParameterStatus(name: string, current: number, avg: number, stdDev: number): string {
  const threshold = ENV_THRESHOLDS[name];
  if (!threshold) return 'normal';
  if (current < threshold.min || current > threshold.max) return 'critical';
  if (stdDev > 0 && Math.abs(current - avg) / stdDev > 2) return 'warning';
  return 'normal';
}

function processParameterData(name: string, data: { values: number[]; unit: string }) {
  const sorted = [...data.values].sort((a, b) => a - b);
  const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const current = sorted[sorted.length - 1];
  const stdDev = Math.sqrt(
    data.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.values.length
  );
  const status = classifyParameterStatus(name, current, avg, stdDev);

  return {
    param: {
      name,
      type: name,
      currentValue: Math.round(current * 100) / 100,
      unit: data.unit,
      historicalAvg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      trend: 'stable',
      dataPoints: data.values.length,
      status,
    },
    anomaly: status !== 'normal' ? { parameter: name, value: current, expected: avg, severity: status } : null,
  };
}

/** Process environmental data into summary format */
function processEnvironmentalSummary(
  rawParams: Record<string, { values: number[]; unit: string }>
) {
  const parameters = [];
  const anomalies = [];

  for (const [name, data] of Object.entries(rawParams)) {
    if (data.values.length === 0) continue;
    const { param, anomaly } = processParameterData(name, data);
    parameters.push(param);
    if (anomaly) anomalies.push(anomaly);
  }

  let qualityScore = 70 - anomalies.length * 10;
  qualityScore = Math.max(0, qualityScore);
  if (parameters.length >= 4) qualityScore = Math.min(100, qualityScore + 10);

  return {
    parameters,
    habitat_quality_score: qualityScore,
    anomalies,
    data_quality: {
      parameterCount: parameters.length,
      totalMeasurements: Object.values(rawParams).reduce((sum, p) => sum + p.values.length, 0),
    },
  };
}

/** Process a single MPA: fetch OBIS data and upsert to Supabase */
export async function processMPA(mpa: PipelineMPA): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  const radius = getSearchRadius(mpa.area_km2);
  const ecosystem = getEcosystem(mpa.center_lat, mpa.description);
  const speciesList = INDICATOR_SPECIES[ecosystem] || INDICATOR_SPECIES.default;

  try {
    // 1. Fetch abundance data for each indicator species
    const speciesTrends = [];
    let totalRecords = 0;

    for (const species of speciesList) {
      // Rate limit: 1s between OBIS requests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const dataPoints = await fetchOBISAbundance(
        mpa.center_lat,
        mpa.center_lon,
        radius,
        species
      );

      if (dataPoints.length === 0) continue;

      const { trend, changePercent, confidence } = calculateTrend(dataPoints);
      const records = dataPoints.reduce((sum, d) => sum + d.count, 0);
      totalRecords += records;

      speciesTrends.push({
        scientific_name: species,
        trend,
        change_percent: changePercent,
        confidence,
        data_points: dataPoints,
      });
    }

    // 2. Upsert population trends
    for (const st of speciesTrends) {
      await supabase.from('population_trends').upsert(
        {
          mpa_id: mpa.external_id,
          scientific_name: st.scientific_name,
          trend: st.trend,
          change_percent: st.change_percent,
          confidence: st.confidence,
          data_points: st.data_points,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'mpa_id,scientific_name' }
      );
    }

    // 3. Calculate overall abundance summary
    const increasing = speciesTrends.filter((s) => s.trend === 'increasing').length;
    const decreasing = speciesTrends.filter((s) => s.trend === 'decreasing').length;
    let overallTrend: string = 'stable';
    if (increasing > decreasing && increasing > speciesTrends.length * 0.4) overallTrend = 'increasing';
    else if (decreasing > increasing && decreasing > speciesTrends.length * 0.4) overallTrend = 'decreasing';
    else if (speciesTrends.length === 0) overallTrend = 'insufficient_data';

    // Health score: based on species diversity and trend direction
    let healthScore = 50;
    healthScore += speciesTrends.length * 5; // species diversity bonus
    healthScore += increasing * 5; // positive trend bonus
    healthScore -= decreasing * 5; // negative trend penalty
    healthScore = Math.max(0, Math.min(100, healthScore));

    await supabase.from('mpa_abundance_summaries').upsert(
      {
        mpa_id: mpa.external_id,
        species_count: speciesTrends.length,
        trend_direction: overallTrend,
        health_score: healthScore,
        total_records: totalRecords,
        data_quality: {
          speciesQueried: speciesList.length,
          speciesWithData: speciesTrends.length,
          ecosystem,
          searchRadiusKm: radius,
        },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'mpa_id' }
    );

    // 4. Fetch and process environmental data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const envRaw = await fetchOBISEnvironmental(mpa.center_lat, mpa.center_lon, radius);
    const envSummary = processEnvironmentalSummary(envRaw.parameters);

    await supabase.from('environmental_summaries').upsert(
      {
        mpa_id: mpa.external_id,
        parameters: envSummary.parameters,
        habitat_quality_score: envSummary.habitat_quality_score,
        anomalies: envSummary.anomalies,
        data_quality: envSummary.data_quality,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'mpa_id' }
    );

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Run the pipeline for a batch of MPAs */
export async function runPipeline(batchSize: number = 5): Promise<{
  processed: number;
  failed: number;
  errors: { mpaId: string; error: string }[];
}> {
  const supabase = getServiceClient();

  // Create pipeline run record
  const { data: run } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running' })
    .select('id')
    .single();

  const runId = run?.id;
  const mpas = await getMPAsForPipeline(batchSize);

  let processed = 0;
  let failed = 0;
  const errors: { mpaId: string; error: string }[] = [];

  for (const mpa of mpas) {
    // 2s delay between MPAs to be nice to OBIS
    if (processed > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const result = await processMPA(mpa);
    if (result.success) {
      processed++;
    } else {
      failed++;
      errors.push({ mpaId: mpa.external_id, error: result.error || 'Unknown error' });
    }
  }

  // Update pipeline run
  if (runId) {
    await supabase.from('pipeline_runs').update({
      completed_at: new Date().toISOString(),
      status: errors.length === mpas.length ? 'failed' : 'completed',
      mpas_processed: processed,
      mpas_failed: failed,
      errors,
    }).eq('id', runId);
  }

  return { processed, failed, errors };
}
