import { describe, it, expect } from 'vitest';
import {
  aggregateAbundanceByMonth,
  calculateTrend,
  processSpeciesTrends,
  calculateOverallBiodiversity,
} from '@/lib/obis-abundance';
import type { OBISAbundanceRecord, AbundanceDataPoint, AbundanceTrend } from '@/types/obis-abundance';

function makeRecord(overrides: Partial<OBISAbundanceRecord> = {}): OBISAbundanceRecord {
  return {
    occurrenceID: '1',
    scientificName: 'Tursiops truncatus',
    eventDate: '2024-01-15',
    decimalLatitude: -33.9,
    decimalLongitude: 18.4,
    individualCount: 1,
    occurrenceStatus: 'present',
    basisOfRecord: 'HumanObservation',
    ...overrides,
  };
}

describe('aggregateAbundanceByMonth', () => {
  it('aggregates records by month', () => {
    const records = [
      makeRecord({ occurrenceID: '1', eventDate: '2024-01-15', individualCount: 5 }),
      makeRecord({ occurrenceID: '2', eventDate: '2024-01-20', individualCount: 3 }),
      makeRecord({ occurrenceID: '3', eventDate: '2024-02-10', individualCount: 7 }),
    ];
    const result = aggregateAbundanceByMonth(records);
    expect(result.get('2024-01')?.count).toBe(8);
    expect(result.get('2024-01')?.recordCount).toBe(2);
    expect(result.get('2024-02')?.count).toBe(7);
    expect(result.get('2024-02')?.recordCount).toBe(1);
  });

  it('skips records without eventDate', () => {
    const records = [
      makeRecord({ eventDate: undefined as unknown as string }),
    ];
    const result = aggregateAbundanceByMonth(records);
    expect(result.size).toBe(0);
  });

  it('defaults individualCount to parsed organismQuantity', () => {
    const records = [
      makeRecord({
        eventDate: '2024-03-10',
        individualCount: undefined,
        organismQuantity: '15',
      }),
    ];
    const result = aggregateAbundanceByMonth(records);
    expect(result.get('2024-03')?.count).toBe(15);
  });

  it('defaults to count of 1 when no quantity fields present', () => {
    const records = [
      makeRecord({
        eventDate: '2024-04-01',
        individualCount: undefined,
        organismQuantity: undefined,
      }),
    ];
    const result = aggregateAbundanceByMonth(records);
    expect(result.get('2024-04')?.count).toBe(1);
  });

  it('assigns quality based on record count', () => {
    // Single record: low quality
    const singleRecord = [makeRecord({ eventDate: '2024-01-01' })];
    const singleResult = aggregateAbundanceByMonth(singleRecord);
    expect(singleResult.get('2024-01')?.quality).toBe('low');

    // 5 records: medium quality
    const fiveRecords = Array.from({ length: 5 }, (_, i) =>
      makeRecord({ occurrenceID: String(i), eventDate: '2024-02-01' })
    );
    const fiveResult = aggregateAbundanceByMonth(fiveRecords);
    expect(fiveResult.get('2024-02')?.quality).toBe('medium');

    // 10 records: high quality
    const tenRecords = Array.from({ length: 10 }, (_, i) =>
      makeRecord({ occurrenceID: String(i), eventDate: '2024-03-01' })
    );
    const tenResult = aggregateAbundanceByMonth(tenRecords);
    expect(tenResult.get('2024-03')?.quality).toBe('high');
  });

  it('returns empty map for empty input', () => {
    expect(aggregateAbundanceByMonth([]).size).toBe(0);
  });
});

describe('calculateTrend', () => {
  it('returns insufficient_data for fewer than 6 points', () => {
    const points: AbundanceDataPoint[] = [
      { date: '2024-01', count: 10, recordCount: 3, quality: 'high' },
    ];
    const result = calculateTrend(points);
    expect(result.trend).toBe('insufficient_data');
    expect(result.confidence).toBe('low');
  });

  it('returns insufficient_data for exactly 5 points', () => {
    const points = Array.from({ length: 5 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 50,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.trend).toBe('insufficient_data');
  });

  it('detects increasing trend', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 10 + i * 5,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.trend).toBe('increasing');
    expect(result.changePercent).toBeGreaterThan(0);
  });

  it('detects decreasing trend', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 100 - i * 8,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.trend).toBe('decreasing');
    expect(result.changePercent).toBeLessThan(0);
  });

  it('detects stable trend', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 50,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.trend).toBe('stable');
  });

  it('assigns medium confidence for 12 data points', () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 50,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.confidence).toBe('medium');
  });

  it('assigns high confidence for >= 24 data points', () => {
    const points = Array.from({ length: 24 }, (_, i) => ({
      date: `2023-${String((i % 12) + 1).padStart(2, '0')}`,
      count: 50,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.confidence).toBe('high');
  });

  it('assigns low confidence for 6-11 data points', () => {
    const points = Array.from({ length: 8 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}`,
      count: 50,
      recordCount: 5,
      quality: 'high' as const,
    }));
    const result = calculateTrend(points);
    expect(result.confidence).toBe('low');
  });
});

describe('processSpeciesTrends', () => {
  it('returns empty array for empty records', () => {
    expect(processSpeciesTrends([])).toEqual([]);
  });

  it('groups records by scientific name', () => {
    const records = [
      makeRecord({ scientificName: 'Tursiops truncatus', eventDate: '2024-01-01' }),
      makeRecord({ scientificName: 'Tursiops truncatus', eventDate: '2024-02-01' }),
      makeRecord({ scientificName: 'Carcharodon carcharias', eventDate: '2024-01-01' }),
    ];
    const result = processSpeciesTrends(records);
    expect(result).toHaveLength(2);
    const names = result.map(t => t.scientificName);
    expect(names).toContain('Tursiops truncatus');
    expect(names).toContain('Carcharodon carcharias');
  });

  it('sorts by confidence then data points length', () => {
    // Create enough records to generate different confidence levels
    const manyRecords: OBISAbundanceRecord[] = [];
    // Species A: 24 months of data (high confidence)
    for (let i = 0; i < 24; i++) {
      const month = String((i % 12) + 1).padStart(2, '0');
      const year = i < 12 ? '2023' : '2024';
      manyRecords.push(makeRecord({
        occurrenceID: `a-${i}`,
        scientificName: 'Species A',
        eventDate: `${year}-${month}-01`,
      }));
    }
    // Species B: 8 months of data (low confidence)
    for (let i = 0; i < 8; i++) {
      manyRecords.push(makeRecord({
        occurrenceID: `b-${i}`,
        scientificName: 'Species B',
        eventDate: `2024-${String(i + 1).padStart(2, '0')}-01`,
      }));
    }

    const result = processSpeciesTrends(manyRecords);
    // Species A should come first (higher confidence)
    expect(result[0].scientificName).toBe('Species A');
  });
});

describe('calculateOverallBiodiversity', () => {
  it('returns stable with empty input', () => {
    const result = calculateOverallBiodiversity([]);
    expect(result.trendDirection).toBe('stable');
    expect(result.healthScore).toBe(50);
    expect(result.speciesCount).toBe(0);
  });

  it('returns stable when all trends are insufficient_data', () => {
    const trends: AbundanceTrend[] = [
      {
        speciesName: 'Dolphin',
        scientificName: 'Tursiops truncatus',
        dataPoints: [],
        trend: 'insufficient_data',
        changePercent: 0,
        confidence: 'low',
      },
    ];
    const result = calculateOverallBiodiversity(trends);
    expect(result.trendDirection).toBe('stable');
    expect(result.healthScore).toBe(50);
    expect(result.speciesCount).toBe(1);
  });

  it('detects increasing overall direction', () => {
    const trends: AbundanceTrend[] = Array.from({ length: 5 }, (_, i) => ({
      speciesName: `Species ${i}`,
      scientificName: `Species ${i}`,
      dataPoints: [],
      trend: 'increasing' as const,
      changePercent: 10,
      confidence: 'high' as const,
    }));
    const result = calculateOverallBiodiversity(trends);
    expect(result.trendDirection).toBe('increasing');
    expect(result.healthScore).toBeGreaterThan(50);
  });

  it('detects decreasing overall direction', () => {
    const trends: AbundanceTrend[] = Array.from({ length: 5 }, (_, i) => ({
      speciesName: `Species ${i}`,
      scientificName: `Species ${i}`,
      dataPoints: [],
      trend: 'decreasing' as const,
      changePercent: -10,
      confidence: 'high' as const,
    }));
    const result = calculateOverallBiodiversity(trends);
    expect(result.trendDirection).toBe('decreasing');
  });

  it('factors species diversity into health score', () => {
    // 10 stable species should score higher than 2 stable species due to diversity bonus
    const makeTrends = (count: number): AbundanceTrend[] =>
      Array.from({ length: count }, (_, i) => ({
        speciesName: `Species ${i}`,
        scientificName: `Species ${i}`,
        dataPoints: [],
        trend: 'stable' as const,
        changePercent: 0,
        confidence: 'medium' as const,
      }));

    const smallResult = calculateOverallBiodiversity(makeTrends(2));
    const largeResult = calculateOverallBiodiversity(makeTrends(10));
    expect(largeResult.healthScore).toBeGreaterThan(smallResult.healthScore);
  });
});
