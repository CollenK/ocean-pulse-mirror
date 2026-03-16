/**
 * Types and constants for Beach & Coastal Conditions feature
 * Uses Open-Meteo Weather and Marine APIs (free, no key required)
 */

// ==================== API Response Types ====================

export interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    visibility: number;
    precipitation: number;
    cloud_cover: number;
    relative_humidity_2m: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    uv_index: number[];
  };
}

export interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current: {
    time: string;
    interval: number;
    wave_height: number;
    wave_direction: number;
    wave_period: number;
    swell_wave_height: number;
    swell_wave_direction: number;
    swell_wave_period: number;
    ocean_current_velocity: number;
    ocean_current_direction: number;
    sea_surface_temperature: number;
  };
  daily: {
    time: string[];
    wave_height_max: number[];
  };
}

// ==================== Processed Types ====================

export type UVRiskLevel = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme';
export type SwimSafety = 'safe' | 'caution' | 'dangerous';
export type WaterQualityLevel = 'good' | 'moderate' | 'poor';

export interface WaterQualityAdvisory {
  level: WaterQualityLevel;
  message: string;
  factors: string[];
}

export interface CoastalConditions {
  // Weather
  airTemp: number;
  feelsLike: number;
  weatherDescription: string;
  weatherCode: number;
  isDay: boolean;
  cloudCover: number;
  humidity: number;
  precipitation: number;
  visibility: number; // km

  // Wind
  windSpeed: number; // km/h
  windGusts: number; // km/h
  windDirection: number; // degrees
  windDirectionLabel: string; // e.g. "NE"

  // UV
  uvIndex: number;
  uvRiskLevel: UVRiskLevel;

  // Marine (may be null if marine API fails)
  waterTemp: number | null;
  waveHeight: number | null;
  waveDirection: number | null;
  wavePeriod: number | null;
  swellHeight: number | null;
  maxWaveHeight: number | null;
  currentVelocity: number | null;
  currentDirection: number | null;

  // Computed safety
  swimSafety: SwimSafety;
  swimSafetyReason: string;
  waterQuality: WaterQualityAdvisory;

  // Metadata
  lastUpdated: number;
  timezone: string;
}

export interface CoastalConditionsCache {
  id: string; // mpaId
  conditions: CoastalConditions;
  lastFetched: number;
  expiresAt: number;
}

// ==================== Constants ====================

/**
 * WMO Weather interpretation codes mapped to friendly descriptions
 * @see https://open-meteo.com/en/docs
 */
export const WMO_WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export const UV_THRESHOLDS: Record<UVRiskLevel, { min: number; max: number; advice: string }> = {
  low: { min: 0, max: 2, advice: 'No protection needed' },
  moderate: { min: 3, max: 5, advice: 'Wear sunscreen' },
  high: { min: 6, max: 7, advice: 'Reduce sun exposure' },
  'very-high': { min: 8, max: 10, advice: 'Extra protection needed' },
  extreme: { min: 11, max: Infinity, advice: 'Avoid sun exposure' },
};

export const WAVE_SAFETY_THRESHOLDS = {
  safe: 1.0, // waves under 1m
  caution: 2.0, // waves 1-2m
  // above 2m = dangerous
} as const;

export const WIND_DIRECTION_LABELS: Record<string, [number, number]> = {
  N: [348.75, 11.25],
  NNE: [11.25, 33.75],
  NE: [33.75, 56.25],
  ENE: [56.25, 78.75],
  E: [78.75, 101.25],
  ESE: [101.25, 123.75],
  SE: [123.75, 146.25],
  SSE: [146.25, 168.75],
  S: [168.75, 191.25],
  SSW: [191.25, 213.75],
  SW: [213.75, 236.25],
  WSW: [236.25, 258.75],
  W: [258.75, 281.25],
  WNW: [281.25, 303.75],
  NW: [303.75, 326.25],
  NNW: [326.25, 348.75],
};

/** Cache TTL: 30 minutes */
export const COASTAL_CONDITIONS_TTL = 30 * 60 * 1000;
