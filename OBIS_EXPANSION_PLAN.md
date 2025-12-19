# Ocean PULSE - OBIS Data Expansion Implementation Plan

## Executive Summary

This plan outlines the integration of three new OBIS data types into Ocean PULSE:
1. **Abundance Data** - Population trends and temporal analysis
2. **Environmental Data** - Habitat quality metrics (OBIS-ENV-DATA)
3. **Tracking Data** - Marine megafauna movement patterns

**Estimated Timeline:** 3-4 weeks for complete implementation
**Current Status:** Species occurrence records working ✅

---

## Phase 1: Abundance Data with Temporal Analysis

### 1.1 API Integration Strategy

#### OBIS Endpoints
```typescript
// Occurrence endpoint with abundance fields
GET https://api.obis.org/v3/occurrence
Parameters:
  - geometry: WKT polygon (existing)
  - fields: individualCount,organismQuantity,occurrenceStatus
  - startdate: YYYY-MM-DD (10 years back)
  - enddate: YYYY-MM-DD (today)
  - size: 1000 (max per request)
  - skip: for pagination
```

#### Response Structure
```json
{
  "total": 15000,
  "results": [
    {
      "occurrenceID": "urn:uuid:...",
      "scientificName": "Tursiops truncatus",
      "decimalLatitude": -18.2871,
      "decimalLongitude": 147.6992,
      "eventDate": "2020-06-15T10:30:00Z",
      "individualCount": 12,
      "organismQuantity": "12",
      "organismQuantityType": "individuals",
      "occurrenceStatus": "present",
      "basisOfRecord": "HumanObservation"
    }
  ]
}
```

#### Key Considerations
- **Missing Data**: ~60% of OBIS records lack abundance data
- **Data Quality**: Filter for `occurrenceStatus: "present"` only
- **Temporal Resolution**: Aggregate by month/year for trend analysis
- **Rate Limiting**: 100 requests/hour → batch queries carefully

### 1.2 TypeScript Interfaces

```typescript
// types/obis-abundance.ts

export interface OBISAbundanceRecord {
  occurrenceID: string;
  scientificName: string;
  genus?: string;
  family?: string;
  eventDate: string; // ISO 8601
  eventID?: string; // Links related observations
  decimalLatitude: number;
  decimalLongitude: number;

  // Abundance fields
  individualCount?: number;
  organismQuantity?: string;
  organismQuantityType?: string;
  occurrenceStatus: 'present' | 'absent';

  // Metadata
  basisOfRecord: string;
  datasetID?: string;
  institutionCode?: string;
}

export interface AbundanceTrend {
  speciesName: string;
  scientificName: string;
  dataPoints: AbundanceDataPoint[];
  trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  changePercent: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface AbundanceDataPoint {
  date: string; // YYYY-MM format
  count: number;
  recordCount: number; // Number of observations
  quality: 'high' | 'medium' | 'low';
}

export interface MPAAbundanceSummary {
  mpaId: string;
  speciesTrends: AbundanceTrend[];
  overallBiodiversity: {
    speciesCount: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    healthScore: number; // 0-100
  };
  dataQuality: {
    recordsWithAbundance: number;
    totalRecords: number;
    coveragePercent: number;
  };
  lastUpdated: number; // Unix timestamp
}
```

### 1.3 IndexedDB Schema Extension

```typescript
// lib/offline-storage.ts additions

export interface AbundanceRecord {
  id: string; // composite: `${mpaId}:${speciesName}:${date}`
  mpaId: string;
  scientificName: string;
  genus?: string;
  family?: string;
  date: string; // YYYY-MM
  aggregatedCount: number;
  observationCount: number;
  quality: 'high' | 'medium' | 'low';
  rawRecords: OBISAbundanceRecord[];
}

export interface AbundanceCache {
  id: string; // mpaId
  mpaId: string;
  summary: MPAAbundanceSummary;
  lastFetched: number;
  expiresAt: number; // TTL: 7 days
}

// New object stores
const dbSchema = {
  'abundance-records': { keyPath: 'id', indexes: ['mpaId', 'scientificName', 'date'] },
  'abundance-cache': { keyPath: 'id', indexes: ['lastFetched'] },
};
```

### 1.4 Service Layer Implementation

```typescript
// lib/obis-abundance.ts

import { OBISAbundanceRecord, AbundanceTrend, MPAAbundanceSummary } from '@/types/obis-abundance';
import { createBoundingBox } from './obis-client';
import { openDB } from 'idb';

const OBIS_API_BASE = 'https://api.obis.org/v3';
const REQUEST_DELAY = 1000;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function fetchAbundanceData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50
): Promise<OBISAbundanceRecord[]> {
  const bounds = createBoundingBox(center, radiusKm);
  const wkt = createWKTPolygon(bounds);

  const startDate = getDateYearsAgo(10); // 10-year lookback
  const endDate = new Date().toISOString().split('T')[0];

  const params = new URLSearchParams({
    geometry: wkt,
    startdate: startDate,
    enddate: endDate,
    fields: 'individualCount,organismQuantity,organismQuantityType,occurrenceStatus',
    size: '1000',
  });

  const allRecords: OBISAbundanceRecord[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    await rateLimit();

    params.set('skip', skip.toString());
    const response = await fetch(`${OBIS_API_BASE}/occurrence?${params}`);

    if (!response.ok) {
      console.error(`OBIS abundance fetch error: ${response.status}`);
      break;
    }

    const data = await response.json();
    const records = data.results || [];

    // Filter for records with abundance data
    const withAbundance = records.filter((r: any) =>
      r.occurrenceStatus === 'present' &&
      (r.individualCount || r.organismQuantity)
    );

    allRecords.push(...withAbundance);

    skip += records.length;
    hasMore = records.length === 1000; // Continue if we got max results

    console.log(`[Abundance] Fetched ${allRecords.length} records so far...`);
  }

  return allRecords;
}

export function aggregateAbundanceByMonth(
  records: OBISAbundanceRecord[]
): Map<string, AbundanceDataPoint> {
  const monthlyData = new Map<string, AbundanceDataPoint>();

  for (const record of records) {
    const monthKey = record.eventDate.substring(0, 7); // YYYY-MM
    const count = record.individualCount || parseInt(record.organismQuantity || '0');

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        date: monthKey,
        count: 0,
        recordCount: 0,
        quality: 'high',
      });
    }

    const dataPoint = monthlyData.get(monthKey)!;
    dataPoint.count += count;
    dataPoint.recordCount += 1;
  }

  return monthlyData;
}

export function calculateTrend(dataPoints: AbundanceDataPoint[]): {
  trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  changePercent: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (dataPoints.length < 6) {
    return { trend: 'insufficient_data', changePercent: 0, confidence: 'low' };
  }

  // Simple linear regression
  const xValues = dataPoints.map((_, i) => i);
  const yValues = dataPoints.map(d => d.count);

  const slope = linearRegression(xValues, yValues).slope;
  const avgCount = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const changePercent = (slope / avgCount) * 100;

  const trend = Math.abs(changePercent) < 5 ? 'stable' :
                changePercent > 0 ? 'increasing' : 'decreasing';

  const confidence = dataPoints.length >= 24 ? 'high' :
                     dataPoints.length >= 12 ? 'medium' : 'low';

  return { trend, changePercent, confidence };
}

// Cache management
export async function getCachedAbundanceSummary(
  mpaId: string
): Promise<MPAAbundanceSummary | null> {
  const db = await openDB('ocean-pulse-db', 1);
  const cached = await db.get('abundance-cache', mpaId);

  if (!cached) return null;

  const now = Date.now();
  if (now > cached.expiresAt) {
    // Expired - delete and return null
    await db.delete('abundance-cache', mpaId);
    return null;
  }

  return cached.summary;
}

export async function cacheAbundanceSummary(
  mpaId: string,
  summary: MPAAbundanceSummary
): Promise<void> {
  const db = await openDB('ocean-pulse-db', 1);
  await db.put('abundance-cache', {
    id: mpaId,
    mpaId,
    summary,
    lastFetched: Date.now(),
    expiresAt: Date.now() + CACHE_DURATION,
  });
}
```

### 1.5 Custom React Hook

```typescript
// hooks/useAbundanceData.ts

import { useState, useEffect } from 'react';
import { MPAAbundanceSummary } from '@/types/obis-abundance';
import {
  getCachedAbundanceSummary,
  cacheAbundanceSummary,
  fetchAbundanceData,
  aggregateAbundanceByMonth,
  calculateTrend
} from '@/lib/obis-abundance';

export function useAbundanceData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50
) {
  const [summary, setSummary] = useState<MPAAbundanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadAbundanceData() {
      try {
        setLoading(true);
        setProgress(10);

        // Try cache first
        const cached = await getCachedAbundanceSummary(mpaId);
        if (cached && isMounted) {
          setSummary(cached);
          setLoading(false);
          return;
        }

        setProgress(30);

        // Fetch from OBIS
        const records = await fetchAbundanceData(mpaId, center, radiusKm);

        if (!isMounted) return;
        setProgress(70);

        // Process and aggregate data
        // Group by species, calculate trends, etc.
        const speciesTrends = processSpeciesTrends(records);

        const abundanceSummary: MPAAbundanceSummary = {
          mpaId,
          speciesTrends,
          overallBiodiversity: calculateOverallBiodiversity(speciesTrends),
          dataQuality: {
            recordsWithAbundance: records.length,
            totalRecords: records.length, // Would need total from original query
            coveragePercent: 100, // Calculate based on species with data
          },
          lastUpdated: Date.now(),
        };

        setProgress(90);

        // Cache the result
        await cacheAbundanceSummary(mpaId, abundanceSummary);

        if (isMounted) {
          setSummary(abundanceSummary);
          setProgress(100);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load abundance data');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAbundanceData();

    return () => {
      isMounted = false;
    };
  }, [mpaId, center[0], center[1], radiusKm]);

  return { summary, loading, error, progress };
}
```

### 1.6 UI Component: AbundanceTrendCard

```typescript
// components/AbundanceTrendCard.tsx

'use client';

import { motion } from 'framer-motion';
import { AbundanceTrend } from '@/types/obis-abundance';
import { Icon } from './ui';

interface AbundanceTrendCardProps {
  trend: AbundanceTrend;
}

export function AbundanceTrendCard({ trend }: AbundanceTrendCardProps) {
  const trendColors = {
    increasing: 'from-green-400 to-emerald-500',
    stable: 'from-blue-400 to-cyan-500',
    decreasing: 'from-orange-400 to-red-500',
    insufficient_data: 'from-gray-300 to-gray-400',
  };

  const trendIcons = {
    increasing: 'arrow-trend-up',
    stable: 'minus',
    decreasing: 'arrow-trend-down',
    insufficient_data: 'question',
  };

  const maxCount = Math.max(...trend.dataPoints.map(d => d.count));
  const minCount = Math.min(...trend.dataPoints.map(d => d.count));
  const range = maxCount - minCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-card border border-gray-200 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-ocean-deep text-sm">
            {trend.speciesName}
          </h3>
          <p className="text-xs text-gray-500 italic mt-1">
            {trend.scientificName}
          </p>
        </div>

        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${trendColors[trend.trend]} flex items-center justify-center`}>
          <Icon name={trendIcons[trend.trend]} className="text-white" />
        </div>
      </div>

      {/* Mini Sparkline Chart */}
      <div className="h-16 mb-3 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.5" />

          {/* Trend line */}
          <motion.polyline
            points={trend.dataPoints.map((d, i) => {
              const x = (i / (trend.dataPoints.length - 1)) * 100;
              const y = 100 - ((d.count - minCount) / range) * 80 - 10;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="text-ocean-primary" stopColor="currentColor" />
              <stop offset="100%" className="text-ocean-accent" stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Trend Summary */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-500">Change: </span>
          <span className={`font-semibold ${
            trend.changePercent > 0 ? 'text-green-600' :
            trend.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-gray-500">Confidence:</span>
          <span className={`px-2 py-0.5 rounded-full ${
            trend.confidence === 'high' ? 'bg-green-100 text-green-700' :
            trend.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend.confidence}
          </span>
        </div>
      </div>

      {/* Data Points Count */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <Icon name="chart-simple" size="sm" className="inline mr-1" />
        {trend.dataPoints.length} data points over {Math.floor(trend.dataPoints.length / 12)} years
      </div>
    </motion.div>
  );
}
```

### 1.7 Integration into MPA Detail Page

```typescript
// app/mpa/[id]/page.tsx - Add to existing page

import { useAbundanceData } from '@/hooks/useAbundanceData';
import { AbundanceTrendCard } from '@/components/AbundanceTrendCard';

// Inside component:
const { summary: abundanceSummary, loading: abundanceLoading, progress } = useAbundanceData(
  mpa.id,
  mpa.center,
  50
);

// Add new section after Species Diversity:
{abundanceLoading ? (
  <Card>
    <CardTitle>Population Trends</CardTitle>
    <CardContent>
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-ocean-primary mb-4" />
        <p className="text-gray-600">Analyzing 10 years of abundance data...</p>
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-ocean-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </CardContent>
  </Card>
) : abundanceSummary ? (
  <Card>
    <CardTitle>Population Trends (10-Year Analysis)</CardTitle>
    <CardContent>
      {/* Overall biodiversity summary */}
      <div className="mb-6 p-4 bg-gradient-to-br from-ocean-primary/10 to-ocean-accent/10 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Overall Biodiversity</p>
            <p className="text-3xl font-bold text-ocean-deep">
              {abundanceSummary.overallBiodiversity.healthScore}
              <span className="text-lg text-gray-500">/100</span>
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            abundanceSummary.overallBiodiversity.trendDirection === 'increasing'
              ? 'bg-green-100 text-green-700'
              : abundanceSummary.overallBiodiversity.trendDirection === 'stable'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            <Icon name={
              abundanceSummary.overallBiodiversity.trendDirection === 'increasing'
                ? 'arrow-trend-up'
                : abundanceSummary.overallBiodiversity.trendDirection === 'stable'
                ? 'minus'
                : 'arrow-trend-down'
            } className="inline mr-2" />
            {abundanceSummary.overallBiodiversity.trendDirection}
          </div>
        </div>
      </div>

      {/* Data quality indicator */}
      <div className="mb-4 text-sm text-gray-600">
        <Icon name="info" size="sm" className="inline mr-1" />
        {abundanceSummary.dataQuality.coveragePercent}% of species have abundance data
      </div>

      {/* Trend cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {abundanceSummary.speciesTrends.slice(0, 6).map((trend) => (
          <AbundanceTrendCard key={trend.scientificName} trend={trend} />
        ))}
      </div>

      {/* View all button */}
      {abundanceSummary.speciesTrends.length > 6 && (
        <Button
          fullWidth
          variant="secondary"
          className="mt-4"
          onClick={() => setShowAllTrends(!showAllTrends)}
        >
          <Icon name={showAllTrends ? "angle-up" : "angle-down"} size="sm" />
          {showAllTrends ? 'Show Less' : `View All ${abundanceSummary.speciesTrends.length} Trends`}
        </Button>
      )}
    </CardContent>
  </Card>
) : null}
```

### 1.8 Testing Checklist for Phase 1

- [ ] OBIS API returns abundance data for test MPA (GBR)
- [ ] IndexedDB stores abundance records correctly
- [ ] Cache invalidation works after 7 days
- [ ] Trend calculation produces expected results
- [ ] UI component renders with sample data
- [ ] Loading states and progress indicator work
- [ ] Offline mode serves cached data
- [ ] Error handling for missing abundance data
- [ ] Performance: loads within 30 seconds
- [ ] Mobile responsive design works

---

## Phase 2: Environmental Data (OBIS-ENV-DATA)

### 2.1 API Integration Strategy

#### OBIS eMoF (ExtendedMeasurementOrFact) Endpoint
```typescript
GET https://api.obis.org/v3/occurrence
Parameters:
  - geometry: WKT polygon
  - mof: true (enables eMoF extension)
  - fields: all (includes measurements)
```

#### Priority Environmental Parameters
```typescript
export const PRIORITY_MEASUREMENTS = {
  temperature: ['Temperature', 'Sea temperature', 'Water temperature'],
  salinity: ['Salinity', 'Sea surface salinity'],
  depth: ['Depth', 'Water depth', 'Bottom depth'],
  pH: ['pH', 'Sea water pH'],
  oxygen: ['Dissolved oxygen', 'DO', 'Oxygen saturation'],
  substrate: ['Substrate type', 'Bottom type', 'Seabed type'],
  chlorophyll: ['Chlorophyll', 'Chl-a'],
};
```

### 2.2 TypeScript Interfaces

```typescript
// types/obis-environmental.ts

export interface EnvironmentalMeasurement {
  measurementID: string;
  occurrenceID: string;
  eventID?: string;
  measurementType: string;
  measurementValue: string | number;
  measurementUnit: string;
  measurementDeterminedDate?: string;
  measurementMethod?: string;
  measurementRemarks?: string;
}

export interface EnvironmentalParameter {
  name: string;
  type: 'temperature' | 'salinity' | 'depth' | 'pH' | 'oxygen' | 'substrate' | 'chlorophyll' | 'other';
  currentValue: number;
  unit: string;
  historicalAvg: number;
  min: number;
  max: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  dataPoints: EnvironmentalDataPoint[];
  threshold?: EnvironmentalThreshold;
}

export interface EnvironmentalDataPoint {
  date: string; // YYYY-MM
  value: number;
  unit: string;
  quality: 'high' | 'medium' | 'low';
}

export interface EnvironmentalThreshold {
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface MPAEnvironmentalSummary {
  mpaId: string;
  parameters: EnvironmentalParameter[];
  habitatQualityScore: number; // 0-100
  anomalies: EnvironmentalAnomaly[];
  lastUpdated: number;
}

export interface EnvironmentalAnomaly {
  parameter: string;
  type: 'spike' | 'drop' | 'sustained_change';
  severity: 'low' | 'medium' | 'high';
  startDate: string;
  endDate?: string;
  description: string;
}
```

### 2.3 Service Layer

```typescript
// lib/obis-environmental.ts

export async function fetchEnvironmentalData(
  mpaId: string,
  center: [number, number],
  radiusKm: number = 50
): Promise<EnvironmentalMeasurement[]> {
  const bounds = createBoundingBox(center, radiusKm);
  const wkt = createWKTPolygon(bounds);

  const params = new URLSearchParams({
    geometry: wkt,
    mof: 'true', // Enable eMoF extension
    startdate: getDateYearsAgo(10),
    enddate: new Date().toISOString().split('T')[0],
    size: '1000',
  });

  // Similar pagination logic as abundance data
  // Extract eMoF measurements from response
  // Filter for priority parameters
}

export function detectAnomalies(
  dataPoints: EnvironmentalDataPoint[],
  threshold: EnvironmentalThreshold
): EnvironmentalAnomaly[] {
  const anomalies: EnvironmentalAnomaly[] = [];

  // Statistical anomaly detection
  const mean = dataPoints.reduce((sum, d) => sum + d.value, 0) / dataPoints.length;
  const stdDev = Math.sqrt(
    dataPoints.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / dataPoints.length
  );

  // Detect outliers (>2 std devs from mean)
  for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    const zScore = Math.abs((point.value - mean) / stdDev);

    if (zScore > 2) {
      anomalies.push({
        parameter: 'temperature', // Would be dynamic
        type: point.value > mean ? 'spike' : 'drop',
        severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
        startDate: point.date,
        description: `Unusual ${point.value > mean ? 'increase' : 'decrease'} detected`,
      });
    }
  }

  return anomalies;
}
```

### 2.4 UI Component: EnvironmentalDashboard

```typescript
// components/EnvironmentalDashboard.tsx

export function EnvironmentalDashboard({
  summary
}: {
  summary: MPAEnvironmentalSummary
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {summary.parameters.map((param) => (
        <EnvironmentalMetricCard key={param.name} parameter={param} />
      ))}
    </div>
  );
}

function EnvironmentalMetricCard({ parameter }: { parameter: EnvironmentalParameter }) {
  const getStatusColor = () => {
    if (!parameter.threshold) return 'bg-gray-100 text-gray-700';

    switch (parameter.threshold.status) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const percentOfRange = ((parameter.currentValue - parameter.min) / (parameter.max - parameter.min)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-4 shadow-card border border-gray-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ocean-deep">
          {parameter.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {parameter.threshold?.status || 'normal'}
        </span>
      </div>

      {/* Current Value - Large Display */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-ocean-deep">
          {parameter.currentValue.toFixed(1)}
          <span className="text-sm text-gray-500 ml-2">{parameter.unit}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Avg: {parameter.historicalAvg.toFixed(1)} {parameter.unit}
        </div>
      </div>

      {/* Gauge Visualization */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-ocean-primary to-ocean-accent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, percentOfRange))}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Min/Max Range */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{parameter.min.toFixed(1)}</span>
        <span>{parameter.max.toFixed(1)}</span>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Trend:</span>
        <div className={`flex items-center gap-1 ${
          parameter.trend === 'increasing' ? 'text-green-600' :
          parameter.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
        }`}>
          <Icon name={
            parameter.trend === 'increasing' ? 'arrow-trend-up' :
            parameter.trend === 'decreasing' ? 'arrow-trend-down' : 'minus'
          } size="sm" />
          {parameter.trend}
        </div>
      </div>
    </motion.div>
  );
}
```

---

## Phase 3: Tracking Data Integration

### 3.1 API Strategy

#### OBIS Tracking Data Endpoints
```typescript
// Option 1: Standard OBIS occurrence with tracking-specific filters
GET https://api.obis.org/v3/occurrence
Parameters:
  - geometry: WKT polygon
  - basisofrecord: MachineObservation (satellite tags)
  - taxonid: filter for mammals, turtles, sharks

// Option 2: OBIS-SEAMAP if available
GET https://seamap.env.duke.edu/api/v1/observations
Parameters:
  - bbox: bounding box
  - taxa: marine mammals, sea turtles, sharks
```

### 3.2 TypeScript Interfaces

```typescript
// types/obis-tracking.ts

export interface TrackingPoint {
  id: string;
  occurrenceID: string;
  scientificName: string;
  commonName: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
  tagID?: string;
  sex?: string;
  lifeStage?: string;
  withinMPA: boolean;
  distanceToMPA: number; // km
}

export interface TrackingPath {
  individualID: string;
  scientificName: string;
  commonName: string;
  points: TrackingPoint[];
  mpaMetrics: {
    residencyTimeHours: number;
    boundaryCrossings: number;
    percentTimeInMPA: number;
  };
}

export interface MPATrackingSummary {
  mpaId: string;
  trackedIndividuals: number;
  species: string[];
  paths: TrackingPath[];
  heatmapData: HeatmapPoint[];
  lastUpdated: number;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1 based on visit frequency
}
```

### 3.3 Leaflet Heatmap Component

```typescript
// components/TrackingHeatmap.tsx

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export function TrackingHeatmap({
  heatmapData,
  mpaBoundary
}: {
  heatmapData: HeatmapPoint[];
  mpaBoundary: [number, number][];
}) {
  const HeatmapLayer = () => {
    const map = useMap();

    useEffect(() => {
      const points: [number, number, number][] = heatmapData.map(p => [
        p.lat,
        p.lng,
        p.intensity
      ]);

      const heatLayer = (L as any).heatLayer(points, {
        radius: 25,
        blur: 35,
        maxZoom: 12,
        gradient: {
          0.0: '#3B82F6',
          0.5: '#06B6D4',
          1.0: '#10B981'
        }
      });

      heatLayer.addTo(map);

      // Add MPA boundary
      const boundary = L.polygon(mpaBoundary, {
        color: '#0EA5E9',
        weight: 2,
        fillOpacity: 0.1
      });
      boundary.addTo(map);

      return () => {
        map.removeLayer(heatLayer);
        map.removeLayer(boundary);
      };
    }, [map, heatmapData, mpaBoundary]);

    return null;
  };

  return (
    <div className="h-96 rounded-xl overflow-hidden">
      <MapContainer
        center={[0, 0]} // Calculate from MPA center
        zoom={10}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <HeatmapLayer />
      </MapContainer>
    </div>
  );
}
```

---

## Service Worker Updates

```typescript
// public/service-worker.js additions

const CACHE_NAME = 'ocean-pulse-v2';
const OBIS_CACHE = 'obis-data-v1';

// Cache OBIS API responses
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('api.obis.org')) {
    event.respondWith(
      caches.open(OBIS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        if (cached) {
          // Return cached, but fetch in background
          event.waitUntil(
            fetch(event.request).then((response) => {
              cache.put(event.request, response.clone());
            })
          );
          return cached;
        }

        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch {
          // Offline - return cached if available
          return cached || new Response('Offline', { status: 503 });
        }
      })
    );
  }
});

// Background sync for data refresh
self.addEventListener('sync', (event) => {
  if (event.tag === 'refresh-obis-data') {
    event.waitUntil(refreshCachedData());
  }
});

async function refreshCachedData() {
  // Re-fetch abundance, environmental, tracking data for recently viewed MPAs
  const db = await openIndexedDB();
  const recentMPAs = await db.getAll('mpa-cache');

  for (const mpa of recentMPAs.slice(0, 5)) {
    await fetchAndCacheAbundanceData(mpa.id, mpa.center);
    await fetchAndCacheEnvironmentalData(mpa.id, mpa.center);
  }
}
```

---

## Health Score Integration

```typescript
// lib/health-score.ts

export function calculateHealthScore(
  abundanceSummary: MPAAbundanceSummary,
  environmentalSummary: MPAEnvironmentalSummary,
  trackingSummary: MPATrackingSummary
): number {
  // Biodiversity Health (40 points)
  const biodiversityScore = Math.min(40,
    abundanceSummary.overallBiodiversity.healthScore * 0.4
  );

  // Habitat Quality (35 points)
  const habitatScore = Math.min(35,
    environmentalSummary.habitatQualityScore * 0.35
  );

  // Protected Species Safety (25 points)
  const trackingScore = Math.min(25,
    (trackingSummary.paths.reduce((sum, path) =>
      sum + path.mpaMetrics.percentTimeInMPA, 0
    ) / trackingSummary.paths.length) * 0.25
  );

  return Math.round(biodiversityScore + habitatScore + trackingScore);
}
```

---

## Performance Optimizations

### 1. Progressive Loading
```typescript
// Load data in stages
1. Show cached data immediately (0ms)
2. Load abundance data (5-10s)
3. Load environmental data in background (10-20s)
4. Load tracking data last (20-30s)
```

### 2. Data Sampling
```typescript
// For large datasets, sample strategically
- Keep all data points < 100 records
- Monthly aggregation for 100-1000 records
- Quarterly aggregation for > 1000 records
```

### 3. IndexedDB Indexing
```typescript
// Compound indexes for complex queries
db.createIndex('mpa-date', ['mpaId', 'date']);
db.createIndex('species-date', ['scientificName', 'date']);
```

### 4. Virtualized Lists
```typescript
// For rendering > 50 trend cards
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## Testing Strategy

### Unit Tests
- [ ] Trend calculation algorithms
- [ ] Anomaly detection logic
- [ ] Data aggregation functions
- [ ] Cache invalidation rules

### Integration Tests
- [ ] OBIS API pagination
- [ ] IndexedDB CRUD operations
- [ ] Service Worker caching
- [ ] Offline data retrieval

### E2E Tests
- [ ] Full MPA page load with all data types
- [ ] Offline mode after initial load
- [ ] Data refresh after cache expiration
- [ ] Mobile responsive behavior

### Performance Tests
- [ ] Lighthouse PWA score > 90
- [ ] Initial load < 30s
- [ ] Smooth animations (60fps)
- [ ] Memory usage < 100MB

---

## Deployment Checklist

### Phase 1 Deployment
- [ ] Abundance data API integration complete
- [ ] IndexedDB schema migrated
- [ ] UI components tested on mobile/desktop
- [ ] Offline functionality verified
- [ ] Documentation updated
- [ ] Git commit: "feat: Add 10-year abundance trend analysis"

### Phase 2 Deployment
- [ ] Environmental data integration complete
- [ ] Anomaly detection tested
- [ ] Dashboard UI responsive
- [ ] Threshold warnings functional
- [ ] Git commit: "feat: Add environmental parameter monitoring"

### Phase 3 Deployment
- [ ] Tracking data visualization complete
- [ ] Heatmap rendering optimized
- [ ] Movement metrics accurate
- [ ] All three data types integrated
- [ ] Health score calculation updated
- [ ] Git commit: "feat: Add marine megafauna tracking"

---

## Risk Mitigation

### Data Availability Risks
**Risk:** MPAs may lack sufficient OBIS data
**Mitigation:**
- Display "Data Gap" indicators gracefully
- Show data coverage percentage
- Recommend alternative MPAs with better data

### API Rate Limiting
**Risk:** Exceed 100 requests/hour
**Mitigation:**
- Implement exponential backoff
- Batch queries efficiently
- Cache aggressively (7-day TTL)
- Show progress indicators during long fetches

### Performance Degradation
**Risk:** Large datasets slow down app
**Mitigation:**
- Implement pagination for > 1000 records
- Use Web Workers for heavy calculations
- Virtualize long lists
- Sample data intelligently

---

## Next Steps

**Ready to proceed with Phase 1?**

If approved, I'll begin implementing:
1. `lib/obis-abundance.ts` service layer
2. `types/obis-abundance.ts` interfaces
3. `hooks/useAbundanceData.ts` custom hook
4. `components/AbundanceTrendCard.tsx` UI component
5. IndexedDB schema updates
6. Integration into MPA detail page

Estimated time for Phase 1: **1 week**

Let me know if you'd like any adjustments to the plan before we start! 🌊
