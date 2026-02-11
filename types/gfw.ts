/**
 * Global Fishing Watch API Type Definitions
 * https://globalfishingwatch.org/our-apis/documentation
 *
 * API Version: v3
 * License: Non-commercial use only
 */

// ============================================================================
// Common Types
// ============================================================================

export type GFWTemporalResolution = 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'ENTIRE';
export type GFWSpatialResolution = 'LOW' | 'HIGH'; // LOW = 10th degree, HIGH = 100th degree
export type GFWGroupBy = 'VESSEL_ID' | 'FLAG' | 'GEARTYPE' | 'FLAGANDGEARTYPE' | 'MMSI' | 'VESSEL_TYPE';

export interface GFWDateRange {
  start: string; // ISO date string
  end: string;
}

export interface GFWBoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ============================================================================
// Vessel Types
// ============================================================================

export interface GFWVessel {
  id: string;
  name?: string;
  mmsi?: string;
  imo?: string;
  callsign?: string;
  flag?: string;
  gearType?: string;
  vesselType?: string;
  length?: number;
  tonnage?: number;
  owner?: string;
  operator?: string;
  authorizations?: GFWAuthorization[];
}

export interface GFWAuthorization {
  sourceCode: string;
  sourceName: string;
  isAuthorized: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface GFWVesselSearchParams {
  query?: string;
  ids?: string[];
  datasets?: string[];
  limit?: number;
  offset?: number;
}

export interface GFWVesselSearchResponse {
  entries: GFWVessel[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// 4Wings API Types (Fishing Effort / Vessel Presence)
// ============================================================================

export interface GFW4WingsReportParams {
  datasets: string[];
  dateRange: string; // 'YYYY-MM-DD,YYYY-MM-DD'
  spatialResolution?: GFWSpatialResolution;
  temporalResolution?: GFWTemporalResolution;
  groupBy?: GFWGroupBy[];
  filters?: GFWFilters;
  region?: GFWRegion;
}

export interface GFWFilters {
  flag?: string[];
  geartype?: string[];
  vessel_id?: string[];
  distance_from_port_km?: {
    min?: number;
    max?: number;
  };
  speed?: {
    min?: number;
    max?: number;
  };
}

export interface GFWRegion {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface GFW4WingsReportResponse {
  entries: GFWFishingEffortEntry[];
  metadata: {
    datasets: string[];
    dateRange: GFWDateRange;
    spatialAggregation: boolean;
    temporalAggregation: boolean;
  };
}

export interface GFWFishingEffortEntry {
  date?: string;
  flag?: string;
  geartype?: string;
  vesselId?: string;
  lat?: number;
  lon?: number;
  cellId?: string;
  hours: number; // Fishing hours
  vesselCount?: number;
}

// Aggregated fishing data for an MPA
export interface GFWFishingEffortSummary {
  mpaId: string;
  dateRange: GFWDateRange;
  totalFishingHours: number;
  totalVessels: number;
  byFlag: GFWFlagBreakdown[];
  byGearType: GFWGearTypeBreakdown[];
  monthlyTrend: GFWMonthlyData[];
  hotspots: GFWHotspot[];
  lastUpdated: number;
}

export interface GFWFlagBreakdown {
  flag: string;
  flagName: string; // Human-readable country name
  fishingHours: number;
  vesselCount: number;
  percentage: number;
}

export interface GFWGearTypeBreakdown {
  gearType: string;
  gearTypeName: string; // Human-readable gear type
  fishingHours: number;
  vesselCount: number;
  percentage: number;
}

export interface GFWMonthlyData {
  month: string; // 'YYYY-MM'
  fishingHours: number;
  vesselCount: number;
}

export interface GFWHotspot {
  lat: number;
  lon: number;
  fishingHours: number;
  intensity: 'low' | 'medium' | 'high' | 'very_high';
}

// ============================================================================
// Events API Types
// ============================================================================

export type GFWEventType = 'fishing' | 'encounter' | 'loitering' | 'port_visit' | 'gap';

export interface GFWEventsParams {
  datasets?: string[];
  startDate?: string;
  endDate?: string;
  vesselIds?: string[]; // Required - Events API requires specific vessel IDs
  types?: GFWEventType[];
  encounterTypes?: string[];
  confidences?: number[];
  limit?: number;
  offset?: number;
  // Note: region-based queries are NOT supported by the Events API
}

export interface GFWEvent {
  id: string;
  type: GFWEventType;
  start: string;
  end: string;
  position: {
    lat: number;
    lon: number;
  };
  regions?: {
    mpa?: string[];
    eez?: string[];
    rfmo?: string[];
  };
  vessel: {
    id: string;
    name?: string;
    ssvid?: string;
    flag?: string;
    type?: string;
  };
  encounter?: {
    vessel: {
      id: string;
      name?: string;
      ssvid?: string;
      flag?: string;
      type?: string;
    };
    medianDistanceKm?: number;
    medianSpeedKnots?: number;
    authorizationStatus?: string;
  };
  loitering?: {
    totalDistanceKm?: number;
    averageSpeedKnots?: number;
    averageDistanceFromShoreKm?: number;
  };
  fishing?: {
    totalDistanceKm?: number;
    averageSpeedKnots?: number;
    averageDepthM?: number;
  };
  portVisit?: {
    durationHours?: number;
    startAnchorage?: {
      lat: number;
      lon: number;
      name?: string;
      flag?: string;
    };
    intermediateAnchorage?: {
      lat: number;
      lon: number;
      name?: string;
    };
    endAnchorage?: {
      lat: number;
      lon: number;
      name?: string;
      flag?: string;
    };
  };
}

export interface GFWEventsResponse {
  entries: GFWEvent[];
  total: number;
  limit: number;
  offset: number;
  nextOffset?: number;
}

// Processed events for UI display
export interface GFWVesselActivity {
  id: string;
  type: GFWEventType;
  timestamp: string;
  duration?: number; // hours
  location: [number, number]; // [lat, lon]
  vessel: {
    id: string;
    name: string;
    flag: string;
    flagName: string;
    mmsi?: string;
    gearType?: string;
  };
  description: string;
  severity: 'info' | 'warning' | 'alert';
  relatedMPA?: string;
}

// ============================================================================
// Insights API Types (IUU Risk)
// ============================================================================

export interface GFWInsightsParams {
  vessels: string[];
  includes?: string[];
}

export interface GFWVesselInsight {
  vesselId: string;
  vessel: GFWVessel;
  apparentFishing?: {
    value: number;
    averageByVesselType: number;
  };
  coverage?: {
    value: number;
    blocks: {
      startDate: string;
      endDate: string;
      percentageTransmissions: number;
    }[];
  };
  gaps?: {
    value: number;
    events: {
      start: string;
      end: string;
      durationHours: number;
      startDistance?: number;
      endDistance?: number;
    }[];
  };
  eventsInNoTakeMPAs?: {
    value: number;
    events: string[];
  };
  eventsInRFMOsWithoutAuthorization?: {
    value: number;
    events: string[];
  };
  voyageRiskScore?: number;
}

export interface GFWInsightsResponse {
  entries: GFWVesselInsight[];
}

// IUU Risk assessment for an MPA
export interface GFWIUURiskAssessment {
  mpaId: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: GFWRiskFactor[];
  vesselCount: number;
  highRiskVesselCount: number;
  lastUpdated: number;
}

export interface GFWRiskFactor {
  type: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// Fishing Compliance Types
// ============================================================================

export interface GFWComplianceScore {
  mpaId: string;
  score: number; // 0-100
  fishingHoursInside: number;
  fishingHoursBuffer: number; // 10km buffer zone
  violations: number;
  trend: 'improving' | 'stable' | 'declining';
  confidence: 'high' | 'medium' | 'low';
  protectionEffectiveness: number; // % reduction from pre-protection baseline
  lastUpdated: number;
}

// ============================================================================
// Cached Data Types
// ============================================================================

export interface CachedGFWFishingData {
  mpaId: string;
  summary: GFWFishingEffortSummary;
  events: GFWVesselActivity[];
  compliance: GFWComplianceScore;
  iuuRisk: GFWIUURiskAssessment;
  lastUpdated: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface GFWAPIError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

export const GFW_DATASETS = {
  // Effort/Presence datasets
  FISHING_EFFORT: 'public-global-fishing-effort:latest',
  VESSEL_PRESENCE: 'public-global-presence:latest',
  SAR_PRESENCE: 'public-global-sar-presence:latest',
  // Event datasets
  FISHING_EVENTS: 'public-global-fishing-events:latest',
  ENCOUNTER_EVENTS: 'public-global-encounters-events:latest',
  LOITERING_EVENTS: 'public-global-loitering-events:latest',
  PORT_VISITS_EVENTS: 'public-global-port-visits-events:latest',
} as const;

export const GFW_GEAR_TYPES: Record<string, string> = {
  trawlers: 'Trawlers',
  purse_seines: 'Purse Seines',
  drifting_longlines: 'Drifting Longlines',
  fixed_gear: 'Fixed Gear',
  pole_and_line: 'Pole and Line',
  trollers: 'Trollers',
  squid_jigger: 'Squid Jiggers',
  set_longlines: 'Set Longlines',
  set_gillnets: 'Set Gillnets',
  pots_and_traps: 'Pots and Traps',
  other_fishing: 'Other Fishing',
  other_purse_seines: 'Other Purse Seines',
  dredge_fishing: 'Dredge Fishing',
  fishing: 'Fishing (Unspecified)',
};

export const GFW_FLAG_NAMES: Record<string, string> = {
  CHN: 'China',
  TWN: 'Taiwan',
  JPN: 'Japan',
  KOR: 'South Korea',
  ESP: 'Spain',
  IDN: 'Indonesia',
  USA: 'United States',
  RUS: 'Russia',
  PHL: 'Philippines',
  VNM: 'Vietnam',
  THA: 'Thailand',
  MYS: 'Malaysia',
  IND: 'India',
  PER: 'Peru',
  MEX: 'Mexico',
  NOR: 'Norway',
  ISL: 'Iceland',
  GBR: 'United Kingdom',
  FRA: 'France',
  PRT: 'Portugal',
  ITA: 'Italy',
  GRC: 'Greece',
  TUR: 'Turkey',
  ARG: 'Argentina',
  CHL: 'Chile',
  ECU: 'Ecuador',
  BRA: 'Brazil',
  AUS: 'Australia',
  NZL: 'New Zealand',
  ZAF: 'South Africa',
  // Add more as needed
};
