/**
 * OBIS Environmental Data Types
 * For habitat quality monitoring using OBIS-ENV-DATA (eMoF extension)
 */

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

export interface EnvironmentalAnomaly {
  parameter: string;
  type: 'spike' | 'drop' | 'sustained_change';
  severity: 'low' | 'medium' | 'high';
  startDate: string;
  endDate?: string;
  description: string;
}

export interface MPAEnvironmentalSummary {
  mpaId: string;
  parameters: EnvironmentalParameter[];
  habitatQualityScore: number; // 0-100
  anomalies: EnvironmentalAnomaly[];
  dataQuality: {
    measurementsCount: number;
    parametersCount: number;
    coveragePercent: number;
  };
  lastUpdated: number;
}

export interface EnvironmentalCache {
  id: string; // mpaId
  mpaId: string;
  summary: MPAEnvironmentalSummary;
  lastFetched: number;
  expiresAt: number; // TTL: 7 days
}

// Priority measurements to extract from OBIS eMoF
export const PRIORITY_MEASUREMENTS = {
  temperature: ['Temperature', 'Sea temperature', 'Water temperature', 'Sea surface temperature', 'SST'],
  salinity: ['Salinity', 'Sea surface salinity', 'PSU', 'Practical salinity'],
  depth: ['Depth', 'Water depth', 'Bottom depth', 'Sample depth'],
  pH: ['pH', 'Sea water pH', 'Water pH', 'Acidity'],
  oxygen: ['Dissolved oxygen', 'DO', 'Oxygen saturation', 'O2'],
  substrate: ['Substrate type', 'Bottom type', 'Seabed type', 'Sediment type'],
  chlorophyll: ['Chlorophyll', 'Chl-a', 'Chlorophyll a', 'Chlorophyll concentration'],
} as const;

// Environmental thresholds for different parameters
export const ENVIRONMENTAL_THRESHOLDS: Record<string, Partial<EnvironmentalThreshold>> = {
  temperature: {
    warningMin: 10,
    warningMax: 30,
    criticalMin: 5,
    criticalMax: 35,
  },
  salinity: {
    warningMin: 30,
    warningMax: 40,
    criticalMin: 25,
    criticalMax: 45,
  },
  pH: {
    warningMin: 7.8,
    warningMax: 8.4,
    criticalMin: 7.5,
    criticalMax: 8.7,
  },
  oxygen: {
    warningMin: 5,
    criticalMin: 3,
  },
  depth: {
    // Depth doesn't have thresholds
  },
  chlorophyll: {
    warningMax: 10,
    criticalMax: 20,
  },
};
