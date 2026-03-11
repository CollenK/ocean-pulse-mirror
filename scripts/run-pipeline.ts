/**
 * Local script to process all MPAs through the OBIS data pipeline.
 *
 * Usage:
 *   npx tsx scripts/run-pipeline.ts
 *   npx tsx scripts/run-pipeline.ts --resume           # Skip already-processed MPAs
 *   npx tsx scripts/run-pipeline.ts --limit 50         # Process only 50 MPAs
 *   npx tsx scripts/run-pipeline.ts --region Europe    # Process only European MPAs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env and .env.local from project root
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY && !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.warn('\nWARNING: SUPABASE_SERVICE_ROLE_KEY not found. Using anon key instead.');
  console.warn('If writes fail due to RLS, add the service role key to .env.local.');
  console.warn('Find it at: Supabase Dashboard > Settings > API > service_role\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY!);

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const resumeMode = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const regionIdx = args.indexOf('--region');
const regionFilter = regionIdx !== -1 ? args[regionIdx + 1] : null;

// ── Region → Country code mapping ────────────────────────────────────
const REGION_COUNTRIES: Record<string, string[]> = {
  'Europe': [
    'ALB', 'AUT', 'BEL', 'BGR', 'BIH', 'BLR', 'CHE', 'CYP', 'CZE', 'DEU',
    'DNK', 'ESP', 'EST', 'FIN', 'FRA', 'FRO', 'GBR', 'GIB', 'GRC', 'HRV',
    'HUN', 'IRL', 'ISL', 'ITA', 'LIE', 'LTU', 'LUX', 'LVA', 'MCO', 'MDA',
    'MKD', 'MLT', 'MNE', 'NLD', 'NOR', 'POL', 'PRT', 'ROU', 'RUS', 'SJM',
    'SMR', 'SRB', 'SVK', 'SVN', 'SWE', 'TUR', 'UKR',
  ],
  'Caribbean': [
    'ABW', 'AIA', 'ATG', 'BHS', 'BLM', 'BRB', 'CUB', 'CUW', 'CYM', 'DMA',
    'DOM', 'GLP', 'GRD', 'HTI', 'JAM', 'KNA', 'LCA', 'MAF', 'MSR', 'MTQ',
    'PRI', 'SXM', 'TCA', 'TTO', 'VCT', 'VGB', 'VIR',
  ],
  'Southeast Asia': [
    'BRN', 'IDN', 'KHM', 'LAO', 'MMR', 'MYS', 'PHL', 'SGP', 'THA', 'TLS', 'VNM',
  ],
  'Pacific Islands': [
    'ASM', 'COK', 'FJI', 'FSM', 'GUM', 'KIR', 'MHL', 'MNP', 'NCL', 'NIU',
    'NRU', 'PCN', 'PLW', 'PNG', 'PYF', 'SLB', 'TKL', 'TON', 'TUV', 'VUT', 'WSM',
  ],
  'East Africa': [
    'COM', 'DJI', 'ERI', 'KEN', 'MDG', 'MOZ', 'MUS', 'MYT', 'REU', 'SOM',
    'SYC', 'TZA', 'ZAF',
  ],
  'West Africa': [
    'BEN', 'CIV', 'CMR', 'CPV', 'GAB', 'GHA', 'GIN', 'GMB', 'GNB', 'GNQ',
    'LBR', 'MRT', 'NGA', 'SEN', 'SLE', 'STP', 'TGO',
  ],
  'South America': [
    'ARG', 'BOL', 'BRA', 'CHL', 'COL', 'ECU', 'GUF', 'GUY', 'PER', 'PRY',
    'SUR', 'URY', 'VEN',
  ],
  'Central America': [
    'BLZ', 'CRI', 'GTM', 'HND', 'MEX', 'NIC', 'PAN', 'SLV',
  ],
  'North America': ['CAN', 'USA'],
};

// ── Import processMPA from pipeline-service ──────────────────────────
// We can't directly import because it uses its own getServiceClient().
// Instead, we inline the processing logic to avoid env coupling issues.
// Re-export would require Next.js runtime. So we duplicate the core logic here.

const OBIS_API_BASE = 'https://api.obis.org/v3';

interface PipelineMPA {
  external_id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  area_km2: number;
  description: string | null;
}

/** Parse PostGIS center point to [lat, lon] */
function parseCenter(center: unknown): [number, number] | null {
  if (!center) return null;
  if (typeof center === 'string') {
    const match = center.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) return [parseFloat(match[2]), parseFloat(match[1])];
  } else if (typeof center === 'object' && center !== null && 'coordinates' in center) {
    const coords = (center as { coordinates: number[] }).coordinates;
    return [coords[1], coords[0]];
  }
  return null;
}

const INDICATOR_SPECIES: Record<string, string[]> = {
  tropical: ['Acropora', 'Porites', 'Chelonia mydas', 'Delphinidae', 'Lutjanidae', 'Scaridae'],
  temperate: ['Laminaria', 'Zostera', 'Gadus morhua', 'Halichoerus grypus', 'Phocoena phocoena', 'Homarus'],
  polar: ['Euphausia superba', 'Pygoscelis', 'Leptonychotes weddellii', 'Dissostichus'],
  deep_sea: ['Lophelia pertusa', 'Bathymodiolus', 'Coryphaenoides'],
  default: ['Tursiops', 'Chelonia', 'Carcharhinus', 'Epinephelus', 'Posidonia', 'Zostera'],
};

function getEcosystem(lat: number, description: string | null): string {
  const absLat = Math.abs(lat);
  if (absLat > 60) return 'polar';
  if (absLat < 23.5) return 'tropical';
  const desc = (description || '').toLowerCase();
  if (desc.includes('deep') || desc.includes('abyssal') || desc.includes('seamount')) return 'deep_sea';
  return 'temperate';
}

function getSearchRadius(areaKm2: number): number {
  return Math.min(Math.max(Math.round(Math.sqrt(areaKm2 / Math.PI)), 50), 300);
}

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

  const monthlyData = new Map<string, number>();
  for (const record of records) {
    if (!record.eventDate) continue;
    const month = record.eventDate.substring(0, 7);
    const count = record.individualCount || 1;
    monthlyData.set(month, (monthlyData.get(month) || 0) + count);
  }

  return Array.from(monthlyData.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

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

  const confidence = n >= 24 ? 'high' : n >= 12 ? 'medium' : 'low';

  let trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  if (Math.abs(changePercent) < 5) trend = 'stable';
  else if (changePercent > 0) trend = 'increasing';
  else trend = 'decreasing';

  return { trend, changePercent: Math.round(changePercent * 10) / 10, confidence };
}

const MEASUREMENT_TYPES: Record<string, { key: string; unit: string }> = {
  temperature: { key: 'temperature', unit: '\u00B0C' },
  salinity: { key: 'salinity', unit: 'PSU' },
  depth: { key: 'depth', unit: 'm' },
  ph: { key: 'pH', unit: '' },
  oxygen: { key: 'oxygen', unit: 'ml/l' },
  chlorophyll: { key: 'chlorophyll', unit: 'mg/m\u00B3' },
};

async function fetchOBISEnvironmental(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<{ parameters: Record<string, { values: number[]; unit: string }> }> {
  const radiusM = radiusKm * 1000;
  const url = `${OBIS_API_BASE}/occurrence?geometry=CIRCLE(${lon} ${lat},${radiusM})&mof=true&fields=eventDate,decimalLatitude,decimalLongitude&size=500`;

  const response = await fetch(url);
  if (!response.ok) return { parameters: {} };

  const data = await response.json();
  const records = data.results || [];

  const parameters: Record<string, { values: number[]; unit: string }> = {};

  for (const record of records) {
    if (!record.mof) continue;
    for (const mof of record.mof) {
      const typeLC = (mof.measurementType || '').toLowerCase();
      for (const [keyword, info] of Object.entries(MEASUREMENT_TYPES)) {
        if (typeLC.includes(keyword)) {
          const val = parseFloat(mof.measurementValue);
          if (!isNaN(val)) {
            if (!parameters[info.key]) {
              parameters[info.key] = { values: [], unit: info.unit };
            }
            parameters[info.key].values.push(val);
          }
        }
      }
    }
  }

  return { parameters };
}

function processEnvironmentalSummary(
  rawParams: Record<string, { values: number[]; unit: string }>
) {
  const parameters = [];
  const anomalies = [];

  const THRESHOLDS: Record<string, { min: number; max: number }> = {
    temperature: { min: -2, max: 35 },
    salinity: { min: 0, max: 45 },
    pH: { min: 7.5, max: 8.5 },
    oxygen: { min: 2, max: 10 },
    chlorophyll: { min: 0, max: 30 },
  };

  for (const [name, data] of Object.entries(rawParams)) {
    if (data.values.length === 0) continue;

    const sorted = [...data.values].sort((a, b) => a - b);
    const avg = data.values.reduce((a, b) => a + b, 0) / data.values.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const current = sorted[sorted.length - 1];

    const stdDev = Math.sqrt(
      data.values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / data.values.length
    );

    const threshold = THRESHOLDS[name];
    let status = 'normal';
    if (threshold) {
      if (current < threshold.min || current > threshold.max) status = 'critical';
      else if (stdDev > 0 && Math.abs(current - avg) / stdDev > 2) status = 'warning';
    }

    if (status !== 'normal') {
      anomalies.push({ parameter: name, value: current, expected: avg, severity: status });
    }

    parameters.push({
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
    });
  }

  let qualityScore = 70;
  const anomalyPenalty = anomalies.length * 10;
  qualityScore = Math.max(0, qualityScore - anomalyPenalty);
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

async function processMPA(mpa: PipelineMPA): Promise<{ success: boolean; error?: string }> {
  const radius = getSearchRadius(mpa.area_km2);
  const ecosystem = getEcosystem(mpa.center_lat, mpa.description);
  const speciesList = INDICATOR_SPECIES[ecosystem] || INDICATOR_SPECIES.default;

  try {
    // 1. Fetch abundance data for each indicator species
    const speciesTrends = [];
    let totalRecords = 0;

    for (const species of speciesList) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const dataPoints = await fetchOBISAbundance(mpa.center_lat, mpa.center_lon, radius, species);
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

    let healthScore = 50;
    healthScore += speciesTrends.length * 5;
    healthScore += increasing * 5;
    healthScore -= decreasing * 5;
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

// ── Main ──────────────────────────────────────────────────────────────

async function getAllMPAs(): Promise<PipelineMPA[]> {
  const allMPAs: PipelineMPA[] = [];
  const pageSize = 1000;
  let offset = 0;

  // If filtering by region, get the allowed country codes
  const allowedCountries = regionFilter
    ? new Set(REGION_COUNTRIES[regionFilter] || [])
    : null;

  if (regionFilter && (!allowedCountries || allowedCountries.size === 0)) {
    const available = Object.keys(REGION_COUNTRIES).join(', ');
    console.error(`Unknown region "${regionFilter}". Available: ${available}`);
    process.exit(1);
  }

  while (true) {
    const { data, error } = await supabase
      .from('mpas')
      .select('external_id, name, center, area_km2, description, country')
      .not('external_id', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      // Filter by region if specified (country can be semicolon-separated, e.g. "FRA;ESP")
      if (allowedCountries) {
        const codes = (row.country || '').split(';').map((c: string) => c.trim());
        if (!codes.some((c: string) => allowedCountries.has(c))) continue;
      }

      const coords = parseCenter(row.center);
      if (!coords) continue;
      allMPAs.push({
        external_id: row.external_id,
        name: row.name,
        center_lat: coords[0],
        center_lon: coords[1],
        area_km2: row.area_km2,
        description: row.description,
      });
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return allMPAs;
}

async function getAlreadyProcessed(): Promise<Set<string>> {
  const { data } = await supabase
    .from('mpa_abundance_summaries')
    .select('mpa_id');

  return new Set((data || []).map((r: { mpa_id: string }) => r.mpa_id));
}

async function main() {
  console.log('=== Ocean PULSE Data Pipeline ===\n');

  if (regionFilter) console.log(`Region filter: ${regionFilter}`);

  // Fetch all MPAs
  console.log('Fetching MPAs from Supabase...');
  let mpas = await getAllMPAs();
  console.log(`Found ${mpas.length} MPAs total.`);

  // Resume mode: skip already-processed
  if (resumeMode) {
    const processed = await getAlreadyProcessed();
    const before = mpas.length;
    mpas = mpas.filter((m) => !processed.has(m.external_id));
    console.log(`Resume mode: skipping ${before - mpas.length} already-processed MPAs.`);
  }

  // Apply limit
  if (limit < mpas.length) {
    mpas = mpas.slice(0, limit);
    console.log(`Limited to ${limit} MPAs.`);
  }

  console.log(`\nProcessing ${mpas.length} MPAs...\n`);

  // Estimate time: ~8s per MPA (6 species * 1s + 1 env query + 2s gap)
  const estimatedMinutes = Math.round((mpas.length * 8) / 60);
  console.log(`Estimated time: ~${estimatedMinutes} minutes\n`);

  let succeeded = 0;
  let failed = 0;
  const errors: { name: string; id: string; error: string }[] = [];
  const startTime = Date.now();

  for (let i = 0; i < mpas.length; i++) {
    const mpa = mpas[i];
    const progress = `[${i + 1}/${mpas.length}]`;
    process.stdout.write(`${progress} ${mpa.name || mpa.external_id}... `);

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const result = await processMPA(mpa);

    if (result.success) {
      succeeded++;
      console.log('OK');
    } else {
      failed++;
      console.log(`FAILED: ${result.error}`);
      errors.push({ name: mpa.name, id: mpa.external_id, error: result.error || 'Unknown' });
    }

    // Progress summary every 50 MPAs
    if ((i + 1) % 50 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
      const rate = (i + 1) / ((Date.now() - startTime) / 1000 / 60);
      const remaining = Math.round((mpas.length - i - 1) / rate);
      console.log(`\n--- Progress: ${i + 1}/${mpas.length} | ${succeeded} OK, ${failed} failed | ${elapsed}m elapsed, ~${remaining}m remaining ---\n`);
    }
  }

  // Final summary
  const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
  console.log('\n=== Pipeline Complete ===');
  console.log(`Total:     ${mpas.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
  console.log(`Time:      ${totalTime} minutes`);

  if (errors.length > 0) {
    console.log(`\nFailed MPAs:`);
    for (const e of errors) {
      console.log(`  - ${e.name} (${e.id}): ${e.error}`);
    }
  }

  // Log pipeline run to Supabase
  await supabase.from('pipeline_runs').insert({
    status: failed === mpas.length ? 'failed' : 'completed',
    mpas_processed: succeeded,
    mpas_failed: failed,
    errors,
    completed_at: new Date().toISOString(),
  });

  console.log('\nPipeline run logged to Supabase.');
}

main().catch((err) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
