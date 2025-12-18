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

// Observation Types
export interface Observation {
  id?: number;
  mpaId: string;
  photo: Blob;
  location: {
    lat: number;
    lng: number;
  };
  notes: string;
  timestamp: number;
  synced: boolean;
  speciesName?: string;
  quantity?: number;
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
