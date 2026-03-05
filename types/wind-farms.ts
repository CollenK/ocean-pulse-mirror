/**
 * Wind Farm Types
 *
 * Type definitions for offshore wind farm data sourced from:
 *
 * 1. EMODnet Human Activities (primary, 600 polygon features)
 *    WFS: https://ows.emodnet-humanactivities.eu/wfs
 *    Layer: emodnet:windfarmspoly
 *
 * 2. OSPAR Offshore Renewables (complement, 278 features, richer metadata)
 *    WFS: https://odims.ospar.org/geoserver/ows
 *    Layer: odims:ospar_offshore_renewables_2024_01_001
 *    License: CC0 (Public Domain)
 */

// Development status of a wind farm
export type WindFarmStatus =
  | 'Authorised'
  | 'Pre-Construction'
  | 'Under Construction'
  | 'Production'
  | 'Decommissioned'
  | 'Planned'
  | 'Concept/Early Planning'
  | 'Unknown';

// Data source identifier
export type WindFarmSource = 'emodnet' | 'ospar' | 'merged';

// Normalized wind farm record (merged from EMODnet + OSPAR)
export interface WindFarm {
  id: string;
  name: string;
  country: string;
  status: WindFarmStatus;
  capacity: number | null;       // MW
  numberOfTurbines: number | null;
  yearCommissioned: number | null;
  developer: string | null;      // From OSPAR "Operator" field
  geometry: WindFarmGeometry;
  centroid: [number, number];    // [lng, lat] in MapLibre order
  source: WindFarmSource;
  // OSPAR-enriched fields
  operator: string | null;       // Operating company (OSPAR)
  foundation: string | null;     // Foundation type, e.g. "monopile" (OSPAR)
  waterDepth: string | null;     // Water depth info (OSPAR)
  hasEIA: boolean | null;        // Environmental Impact Assessment conducted (OSPAR)
  distanceToCoast: number | null; // Distance to shore in km (OSPAR) or meters (EMODnet)
  areaSqKm: number | null;      // Wind farm area in km^2
  deviceType: string | null;     // "wind turbine", "tidal stream", etc. (OSPAR)
}

export interface WindFarmGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

// GeoJSON feature as returned from EMODnet WFS (windfarmspoly layer)
export interface EMODnetWindFarmFeature {
  type: 'Feature';
  id: string;
  properties: {
    name?: string;
    country?: string;
    status?: string;         // Approved, Construction, Dismantled, Planned, Production
    power_mw?: number | null;
    n_turbines?: number | null;
    year?: string | null;    // Commissioning year (string in EMODnet)
    updateyear?: string | null;
    dist_coast?: number | null; // Distance to coast in meters
    area_sqkm?: number | null;
    notes?: string | null;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface EMODnetWindFarmResponse {
  type: 'FeatureCollection';
  features: EMODnetWindFarmFeature[];
  totalFeatures?: number;
  numberMatched?: number;
  numberReturned?: number;
}

// GeoJSON feature as returned from OSPAR WFS
export interface OSPARWindFarmFeature {
  type: 'Feature';
  id: string;
  properties: {
    ID?: string;               // OSPAR identifier, e.g. "NL002"
    Country?: string;
    Name?: string;
    Distance_t?: number | null; // Distance to shore in km
    Operator?: string | null;
    Device_Typ?: string | null; // "wind turbine", "tidal stream (turbines)", etc.
    No_of_Devi?: number | null; // Number of devices
    Current_St?: string | null; // "operational", "authorised", etc.
    Capacity?: number | null;   // Capacity in MW
    Foundation?: string | null; // Foundation type, e.g. "monopile"
    Water_dept?: string | null; // Water depth info
    Height?: string | null;
    EIA?: string | null;        // "yes" or "no"
    Remarks?: string | null;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface OSPARWindFarmResponse {
  type: 'FeatureCollection';
  features: OSPARWindFarmFeature[];
  totalFeatures?: number;
  numberMatched?: number;
  numberReturned?: number;
}

// Conflict zone: spatial overlap between a wind farm and an MPA
export interface WindFarmMPAConflict {
  windFarmId: string;
  windFarmName: string;
  windFarmStatus: WindFarmStatus;
  windFarmCapacity: number | null;
  mpaId: string;
  mpaName: string;
  mpaHealthScore: number;
  mpaProtectionLevel: string;
}

// Summary stats for the wind farm layer
export interface WindFarmSummary {
  totalFarms: number;
  totalCapacityMW: number;
  byStatus: Record<WindFarmStatus, number>;
  byCountry: Record<string, number>;
  conflictsWithMPAs: number;
}

// Status color mapping for map visualization
export const WIND_FARM_STATUS_COLORS: Record<WindFarmStatus, string> = {
  Production: '#f97316',          // orange-500 - operational
  'Under Construction': '#eab308', // yellow-500 - building
  Authorised: '#84cc16',          // lime-500 - approved
  'Pre-Construction': '#22d3ee',  // cyan-400 - planning
  Planned: '#818cf8',             // indigo-400 - proposed
  'Concept/Early Planning': '#a78bfa', // violet-400 - early stage
  Decommissioned: '#6b7280',      // gray-500 - retired
  Unknown: '#9ca3af',             // gray-400 - unknown
};

// Status labels for display
export const WIND_FARM_STATUS_LABELS: Record<WindFarmStatus, string> = {
  Production: 'Operational',
  'Under Construction': 'Under Construction',
  Authorised: 'Authorised',
  'Pre-Construction': 'Pre-Construction',
  Planned: 'Planned',
  'Concept/Early Planning': 'Early Planning',
  Decommissioned: 'Decommissioned',
  Unknown: 'Unknown',
};
