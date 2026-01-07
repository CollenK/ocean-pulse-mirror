// Core MPA Types
export interface MPA {
  id: string;
  name: string;
  country: string;
  bounds: number[][]; // [[lat, lng], [lat, lng]]
  center: [number, number];
  area: number; // km²
  healthScore: number; // 0-100
  speciesCount: number;
  establishedYear: number;
  protectionLevel: string;
  description?: string;
  regulations?: string;
}

// Species Types
export interface Species {
  id: string;
  scientificName: string;
  commonName?: string;
  taxonomy: Taxonomy;
  conservationStatus?: ConservationStatus;
  occurrenceCount: number;
  lastSeen?: Date;
  thumbnail?: string;
}

export interface Taxonomy {
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
}

export type ConservationStatus =
  | 'LC' // Least Concern
  | 'NT' // Near Threatened
  | 'VU' // Vulnerable
  | 'EN' // Endangered
  | 'CR' // Critically Endangered
  | 'EW' // Extinct in Wild
  | 'EX' // Extinct
  | 'DD' // Data Deficient
  | 'NE'; // Not Evaluated

// Report Type for Observations
export type ReportType =
  | 'species_sighting'
  | 'habitat_condition'
  | 'water_quality'
  | 'threat_concern'
  | 'enforcement_activity'
  | 'research_observation';

export const REPORT_TYPES: Record<ReportType, { label: string; icon: string; description: string }> = {
  species_sighting: {
    label: 'Species Sighting',
    icon: 'fish',
    description: 'Report a marine species observation',
  },
  habitat_condition: {
    label: 'Habitat Condition',
    icon: 'tree',
    description: 'Report on coral, seagrass, or other habitat health',
  },
  water_quality: {
    label: 'Water Quality',
    icon: 'water',
    description: 'Report water clarity, color, or quality issues',
  },
  threat_concern: {
    label: 'Threat/Concern',
    icon: 'exclamation',
    description: 'Report pollution, illegal activity, or other threats',
  },
  enforcement_activity: {
    label: 'Enforcement Activity',
    icon: 'shield-check',
    description: 'Report patrol sightings or enforcement actions',
  },
  research_observation: {
    label: 'Research Observation',
    icon: 'document',
    description: 'Log scientific research data or findings',
  },
};

// Observation Types
export interface Observation {
  id?: number;
  mpaId: string;
  photo: Blob | string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    manuallyEntered?: boolean;
  };
  notes: string;
  timestamp: number;
  synced: boolean;
  speciesName?: string;
  quantity?: number;
  reportType: ReportType;
  healthScoreAssessment?: number; // 1-10 scale
  userId?: string;
  isDraft?: boolean;
}

// User Health Assessment - for contributing to overall MPA health score
export interface UserHealthAssessment {
  id?: number;
  mpaId: string;
  userId: string;
  score: number; // 1-10 scale
  timestamp: number;
  observationId?: number;
  synced: boolean;
}

// Location Types
export interface Location {
  lat: number;
  lng: number;
}

// Network Status Types
export interface NetworkStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType?: string;
}

// OBIS API Types
export interface OBISSearchParams {
  geometry?: string; // WKT polygon
  scientificname?: string;
  startdate?: string;
  enddate?: string;
  startdepth?: number;
  enddepth?: number;
  limit?: number;
  offset?: number;
}

export interface OBISOccurrence {
  id: string;
  scientificName: string;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate: string;
  depth?: number;
  individualCount?: number;
  basisOfRecord?: string;
}

// IndexedDB Types
export interface CachedMPA extends MPA {
  lastUpdated: number;
}

export interface CachedSpeciesData {
  mpaId: string;
  species: Species[];
  totalRecords: number;
  lastUpdated: number;
}

// UI Component Types
export interface HealthGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export interface MPACardProps {
  mpa: MPA;
  distance?: number;
  onClick?: () => void;
}

export interface SpeciesCardProps {
  species: Species;
  onClick?: () => void;
}
