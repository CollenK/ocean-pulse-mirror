/**
 * Indicator Species Types
 * Types for the curated indicator species database
 */

/**
 * Species category classification
 */
export enum SpeciesCategory {
  APEX_PREDATOR = 'apex_predator',
  CORAL = 'coral',
  SEABIRD = 'seabird',
  KEYSTONE = 'keystone',
  FOUNDATION = 'foundation',
  INVERTEBRATE = 'invertebrate',
}

/**
 * Ecosystem types for MPA-specific filtering
 */
export enum EcosystemType {
  CORAL_REEF = 'coral_reef',
  KELP_FOREST = 'kelp_forest',
  SEAGRASS = 'seagrass',
  OPEN_OCEAN = 'open_ocean',
  ROCKY_REEF = 'rocky_reef',
  POLAR = 'polar',
  TEMPERATE = 'temperate',
  TROPICAL = 'tropical',
}

/**
 * Conservation status based on IUCN Red List
 */
export enum ConservationStatus {
  LEAST_CONCERN = 'LC',
  NEAR_THREATENED = 'NT',
  VULNERABLE = 'VU',
  ENDANGERED = 'EN',
  CRITICALLY_ENDANGERED = 'CR',
  DATA_DEFICIENT = 'DD',
}

/**
 * Sensitivity rating - how quickly species respond to environmental changes
 */
export enum SensitivityRating {
  LOW = 'low',       // Slow response (years)
  MEDIUM = 'medium', // Moderate response (months)
  HIGH = 'high',     // Rapid response (weeks)
}

/**
 * Geographic bounding box for species distribution
 */
export interface GeographicBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Main indicator species interface
 */
export interface IndicatorSpecies {
  id: string;
  scientificName: string;
  commonName: string;
  category: SpeciesCategory;
  ecosystems: EcosystemType[];
  obisTaxonId: number;
  conservationStatus: ConservationStatus;
  sensitivityRating: SensitivityRating;
  ecologicalSignificance: string;
  geographicBounds: GeographicBounds;
  imageUrl?: string;
  lastUpdated: number;
}

/**
 * Category metadata for UI display
 */
export interface CategoryInfo {
  id: SpeciesCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  healthScoreWeight: number;
}

/**
 * Filter parameters for species queries
 */
export interface IndicatorSpeciesFilter {
  categories?: SpeciesCategory[];
  ecosystems?: EcosystemType[];
  conservationStatus?: ConservationStatus[];
  searchQuery?: string;
}

/**
 * Species presence data for health score calculation
 */
export interface SpeciesPresence {
  speciesId: string;
  present: boolean;
  occurrenceCount: number;
  lastSeen?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Health score breakdown by category
 */
export interface CategoryHealthScore {
  category: SpeciesCategory;
  score: number;
  maxScore: number;
  speciesPresent: number;
  speciesTotal: number;
  weight: number;
}

/**
 * Complete health score result
 */
export interface IndicatorHealthScore {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  categoryScores: CategoryHealthScore[];
  dataQuality: 'high' | 'medium' | 'low';
  lastCalculated: number;
}

/**
 * IndexedDB cache entry for indicator species
 */
export interface IndicatorSpeciesCache {
  id: string;
  mpaId: string;
  speciesPresence: SpeciesPresence[];
  healthScore: IndicatorHealthScore;
  lastFetched: number;
  expiresAt: number;
}

/**
 * Category metadata definitions
 */
export const CATEGORY_INFO: Record<SpeciesCategory, CategoryInfo> = {
  [SpeciesCategory.APEX_PREDATOR]: {
    id: SpeciesCategory.APEX_PREDATOR,
    name: 'Apex Predators',
    description: 'Top predators indicating ecosystem health and food web stability',
    icon: 'shark',
    color: '#EF4444',
    healthScoreWeight: 0.25,
  },
  [SpeciesCategory.CORAL]: {
    id: SpeciesCategory.CORAL,
    name: 'Coral Species',
    description: 'Reef-building corals indicating water quality and climate impacts',
    icon: 'coral',
    color: '#F59E0B',
    healthScoreWeight: 0.20,
  },
  [SpeciesCategory.FOUNDATION]: {
    id: SpeciesCategory.FOUNDATION,
    name: 'Foundation Species',
    description: 'Habitat-forming species like kelp and seagrass',
    icon: 'leaf',
    color: '#10B981',
    healthScoreWeight: 0.20,
  },
  [SpeciesCategory.KEYSTONE]: {
    id: SpeciesCategory.KEYSTONE,
    name: 'Keystone Species',
    description: 'Species with disproportionate ecological impact',
    icon: 'star',
    color: '#8B5CF6',
    healthScoreWeight: 0.15,
  },
  [SpeciesCategory.SEABIRD]: {
    id: SpeciesCategory.SEABIRD,
    name: 'Seabirds',
    description: 'Seabirds indicating fish stock health and marine productivity',
    icon: 'bird',
    color: '#3B82F6',
    healthScoreWeight: 0.10,
  },
  [SpeciesCategory.INVERTEBRATE]: {
    id: SpeciesCategory.INVERTEBRATE,
    name: 'Invertebrate Indicators',
    description: 'Invertebrates indicating water quality and habitat condition',
    icon: 'shell',
    color: '#EC4899',
    healthScoreWeight: 0.10,
  },
};

/**
 * Conservation status display info
 */
export const CONSERVATION_STATUS_INFO: Record<ConservationStatus, { name: string; color: string; description: string }> = {
  [ConservationStatus.LEAST_CONCERN]: { name: 'Least Concern', color: '#10B981', description: 'Population is stable and widespread. Not currently at risk of decline.' },
  [ConservationStatus.NEAR_THREATENED]: { name: 'Near Threatened', color: '#84CC16', description: 'Close to qualifying as threatened. May need conservation attention soon.' },
  [ConservationStatus.VULNERABLE]: { name: 'Vulnerable', color: '#F59E0B', description: 'Faces a high risk of extinction in the wild due to habitat loss or other threats.' },
  [ConservationStatus.ENDANGERED]: { name: 'Endangered', color: '#F97316', description: 'Faces a very high risk of extinction. Populations are declining significantly.' },
  [ConservationStatus.CRITICALLY_ENDANGERED]: { name: 'Critically Endangered', color: '#EF4444', description: 'Faces an extremely high risk of extinction. Immediate conservation action needed.' },
  [ConservationStatus.DATA_DEFICIENT]: { name: 'Data Deficient', color: '#6B7280', description: 'Not enough data to assess extinction risk. More research is needed.' },
};

/**
 * Ecosystem display info
 */
export const ECOSYSTEM_INFO: Record<EcosystemType, { name: string; icon: string }> = {
  [EcosystemType.CORAL_REEF]: { name: 'Coral Reef', icon: 'coral' },
  [EcosystemType.KELP_FOREST]: { name: 'Kelp Forest', icon: 'leaf' },
  [EcosystemType.SEAGRASS]: { name: 'Seagrass Beds', icon: 'grass' },
  [EcosystemType.OPEN_OCEAN]: { name: 'Open Ocean', icon: 'wave' },
  [EcosystemType.ROCKY_REEF]: { name: 'Rocky Reef', icon: 'rock' },
  [EcosystemType.POLAR]: { name: 'Polar Waters', icon: 'snowflake' },
  [EcosystemType.TEMPERATE]: { name: 'Temperate Waters', icon: 'thermometer' },
  [EcosystemType.TROPICAL]: { name: 'Tropical Waters', icon: 'sun' },
};
