/**
 * OBIS Tracking Data Types
 * For marine megafauna movement patterns and satellite tracking
 */

export interface TrackingPoint {
  id: string;
  occurrenceID: string;
  scientificName: string;
  commonName: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
  tagID?: string;
  individualID?: string;
  sex?: string;
  lifeStage?: string;
  withinMPA: boolean;
  distanceToMPA: number; // km
  basisOfRecord: string;
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
    firstSighting: string; // ISO 8601
    lastSighting: string; // ISO 8601
  };
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1 based on visit frequency
}

export interface MPATrackingSummary {
  mpaId: string;
  trackedIndividuals: number;
  species: string[];
  paths: TrackingPath[];
  heatmapData: HeatmapPoint[];
  speciesBreakdown: {
    scientificName: string;
    commonName: string;
    count: number;
    avgResidencyHours: number;
  }[];
  dataQuality: {
    trackingRecords: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  lastUpdated: number;
}

export interface TrackingCache {
  id: string; // mpaId
  mpaId: string;
  summary: MPATrackingSummary;
  lastFetched: number;
  expiresAt: number; // TTL: 7 days
}

// Basis of record types that indicate tracking data
export const TRACKING_BASIS_OF_RECORD = [
  'MachineObservation', // Satellite tags, acoustic tags
  'HumanObservation', // Visual tracking, acoustic monitoring
] as const;

// Species commonly tracked with satellite tags
export const TRACKED_SPECIES_GROUPS = {
  cetaceans: ['Balaenoptera', 'Megaptera', 'Physeter', 'Orcinus', 'Tursiops', 'Delphinus', 'Stenella'],
  pinnipeds: ['Phoca', 'Halichoerus', 'Mirounga', 'Arctocephalus'],
  seaTurtles: ['Caretta', 'Chelonia', 'Eretmochelys', 'Lepidochelys', 'Dermochelys'],
  sharks: ['Carcharodon', 'Galeocerdo', 'Sphyrna', 'Rhincodon', 'Carcharhinus', 'Isurus'],
  seabirds: ['Phoebastria', 'Diomedea', 'Procellaria', 'Puffinus'],
} as const;
