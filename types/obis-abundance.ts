/**
 * OBIS Abundance Data Types
 * For temporal analysis of species populations in MPAs
 */

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

export interface AbundanceDataPoint {
  date: string; // YYYY-MM format
  count: number;
  recordCount: number; // Number of observations
  quality: 'high' | 'medium' | 'low';
}

export interface AbundanceTrend {
  speciesName: string;
  scientificName: string;
  dataPoints: AbundanceDataPoint[];
  trend: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  changePercent: number;
  confidence: 'high' | 'medium' | 'low';
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
