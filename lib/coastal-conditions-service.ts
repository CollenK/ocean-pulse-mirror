/**
 * Service layer for fetching and processing beach & coastal conditions
 * Uses Open-Meteo Weather and Marine APIs (free, no API key required)
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import { captureError } from '@/lib/error-reporting';
import type {
  OpenMeteoWeatherResponse,
  OpenMeteoMarineResponse,
  CoastalConditions,
  UVRiskLevel,
  SwimSafety,
  WaterQualityAdvisory,
  WaterQualityLevel,
} from '@/types/coastal-conditions';
import {
  WMO_WEATHER_CODES,
  WAVE_SAFETY_THRESHOLDS,
  WIND_DIRECTION_LABELS,
} from '@/types/coastal-conditions';

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_API_URL = 'https://marine-api.open-meteo.com/v1/marine';
const API_TIMEOUT = 15_000;

/**
 * Fetch current weather data from Open-Meteo
 */
async function fetchWeatherData(lat: number, lon: number): Promise<OpenMeteoWeatherResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'precipitation',
      'cloud_cover',
      'relative_humidity_2m',
      'is_day',
    ].join(','),
    hourly: 'uv_index',
    forecast_days: '1',
    timezone: 'auto',
  });

  const response = await fetchWithTimeout(`${WEATHER_API_URL}?${params}`, {
    timeout: API_TIMEOUT,
  });

  if (!response.ok) {
    throw new Error(`Weather API returned ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch current marine data from Open-Meteo Marine API
 */
async function fetchMarineData(lat: number, lon: number): Promise<OpenMeteoMarineResponse> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      'wave_height',
      'wave_direction',
      'wave_period',
      'swell_wave_height',
      'swell_wave_direction',
      'swell_wave_period',
      'ocean_current_velocity',
      'ocean_current_direction',
      'sea_surface_temperature',
    ].join(','),
    daily: 'wave_height_max',
    forecast_days: '1',
    timezone: 'auto',
  });

  const response = await fetchWithTimeout(`${MARINE_API_URL}?${params}`, {
    timeout: API_TIMEOUT,
  });

  if (!response.ok) {
    throw new Error(`Marine API returned ${response.status}`);
  }

  return response.json();
}

/**
 * Convert wind degrees to compass direction label
 */
function degreesToCompass(degrees: number): string {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  // Special case for North (wraps around 360)
  if (normalized >= 348.75 || normalized < 11.25) return 'N';

  for (const [label, [min, max]] of Object.entries(WIND_DIRECTION_LABELS)) {
    if (label === 'N') continue;
    if (normalized >= min && normalized < max) return label;
  }

  return 'N';
}

/**
 * Determine UV risk level from UV index value
 */
function getUVRiskLevel(uvIndex: number): UVRiskLevel {
  if (uvIndex <= 2) return 'low';
  if (uvIndex <= 5) return 'moderate';
  if (uvIndex <= 7) return 'high';
  if (uvIndex <= 10) return 'very-high';
  return 'extreme';
}

/**
 * Get the current hour's UV index from hourly data
 */
function getCurrentUVIndex(hourly: OpenMeteoWeatherResponse['hourly']): number {
  const now = new Date();
  const currentHour = now.getHours();

  if (hourly.uv_index && hourly.uv_index.length > currentHour) {
    return hourly.uv_index[currentHour];
  }

  // Fallback: return 0 (nighttime or no data)
  return 0;
}

/**
 * Determine swim safety from wave height and current velocity
 */
function assessSwimSafety(
  waveHeight: number | null,
  currentVelocity: number | null,
  windSpeed: number,
  weatherCode: number
): { safety: SwimSafety; reason: string } {
  // Thunderstorm = always dangerous
  if (weatherCode >= 95) {
    return { safety: 'dangerous', reason: 'Thunderstorm activity in the area' };
  }

  // Strong winds (>50 km/h) = dangerous
  if (windSpeed > 50) {
    return { safety: 'dangerous', reason: 'Very strong winds' };
  }

  // Check wave height
  if (waveHeight !== null) {
    if (waveHeight > WAVE_SAFETY_THRESHOLDS.caution) {
      return { safety: 'dangerous', reason: `High waves (${waveHeight.toFixed(1)}m)` };
    }
    if (waveHeight > WAVE_SAFETY_THRESHOLDS.safe) {
      return { safety: 'caution', reason: `Moderate waves (${waveHeight.toFixed(1)}m)` };
    }
  }

  // Check ocean current
  if (currentVelocity !== null && currentVelocity > 0.5) {
    return { safety: 'caution', reason: 'Strong ocean currents' };
  }

  // Strong winds (>30 km/h) = caution
  if (windSpeed > 30) {
    return { safety: 'caution', reason: 'Strong winds' };
  }

  return { safety: 'safe', reason: 'Conditions appear calm' };
}

/**
 * Generate water quality advisory based on weather conditions
 * This is an estimate, not a replacement for direct water testing
 */
function assessWaterQuality(
  precipitation: number,
  visibility: number,
  windSpeed: number,
  weatherCode: number
): WaterQualityAdvisory {
  const factors: string[] = [];
  let score = 100; // Start at perfect, subtract for concerning factors

  // Heavy precipitation can wash pollutants into coastal waters
  if (precipitation > 10) {
    score -= 40;
    factors.push('Heavy rainfall may carry runoff into the water');
  } else if (precipitation > 2) {
    score -= 20;
    factors.push('Recent rainfall may affect water clarity');
  }

  // Low visibility often correlates with poor air/water quality
  if (visibility < 2000) {
    score -= 20;
    factors.push('Low visibility conditions');
  }

  // Stormy conditions churn up sediment
  if (weatherCode >= 80) {
    score -= 15;
    factors.push('Stormy conditions may disturb sediment');
  }

  // High winds can stir up shallow waters
  if (windSpeed > 40) {
    score -= 10;
    factors.push('Strong winds may reduce water clarity');
  }

  let level: WaterQualityLevel;
  let message: string;

  if (score >= 70) {
    level = 'good';
    message = 'Weather conditions suggest good water quality';
  } else if (score >= 40) {
    level = 'moderate';
    message = 'Some weather factors may be affecting water quality';
  } else {
    level = 'poor';
    message = 'Weather conditions may be impacting water quality';
  }

  if (factors.length === 0) {
    factors.push('No concerning weather factors detected');
  }

  return { level, message, factors };
}

/**
 * Process raw API responses into a unified CoastalConditions object
 */
function processCoastalConditions(
  weather: OpenMeteoWeatherResponse,
  marine: OpenMeteoMarineResponse | null
): CoastalConditions {
  const uvIndex = getCurrentUVIndex(weather.hourly);
  const waveHeight = marine?.current.wave_height ?? null;
  const currentVelocity = marine?.current.ocean_current_velocity ?? null;

  const { safety: swimSafety, reason: swimSafetyReason } = assessSwimSafety(
    waveHeight,
    currentVelocity,
    weather.current.wind_speed_10m,
    weather.current.weather_code
  );

  const waterQuality = assessWaterQuality(
    weather.current.precipitation,
    weather.current.visibility,
    weather.current.wind_speed_10m,
    weather.current.weather_code
  );

  return {
    // Weather
    airTemp: weather.current.temperature_2m,
    feelsLike: weather.current.apparent_temperature,
    weatherDescription: WMO_WEATHER_CODES[weather.current.weather_code] || 'Unknown',
    weatherCode: weather.current.weather_code,
    isDay: weather.current.is_day === 1,
    cloudCover: weather.current.cloud_cover,
    humidity: weather.current.relative_humidity_2m,
    precipitation: weather.current.precipitation,
    visibility: weather.current.visibility / 1000, // Convert m to km

    // Wind
    windSpeed: weather.current.wind_speed_10m,
    windGusts: weather.current.wind_gusts_10m,
    windDirection: weather.current.wind_direction_10m,
    windDirectionLabel: degreesToCompass(weather.current.wind_direction_10m),

    // UV
    uvIndex,
    uvRiskLevel: getUVRiskLevel(uvIndex),

    // Marine
    waterTemp: marine?.current.sea_surface_temperature ?? null,
    waveHeight,
    waveDirection: marine?.current.wave_direction ?? null,
    wavePeriod: marine?.current.wave_period ?? null,
    swellHeight: marine?.current.swell_wave_height ?? null,
    maxWaveHeight: marine?.daily.wave_height_max?.[0] ?? null,
    currentVelocity,
    currentDirection: marine?.current.ocean_current_direction ?? null,

    // Safety
    swimSafety,
    swimSafetyReason,
    waterQuality,

    // Metadata
    lastUpdated: Date.now(),
    timezone: weather.timezone,
  };
}

/**
 * Fetch and process coastal conditions for an MPA
 * Gracefully degrades if marine data is unavailable (inland coordinates)
 */
export async function fetchCoastalConditions(
  lat: number,
  lon: number
): Promise<CoastalConditions> {
  const results = await Promise.allSettled([
    fetchWeatherData(lat, lon),
    fetchMarineData(lat, lon),
  ]);

  const weatherResult = results[0];
  const marineResult = results[1];

  // Weather is required
  if (weatherResult.status === 'rejected') {
    const reason = weatherResult.reason instanceof Error ? weatherResult.reason.message : String(weatherResult.reason);
    captureError(weatherResult.reason, { context: 'fetchCoastalConditions:weather', lat: String(lat), lon: String(lon) });
    throw new Error(`Weather API failed: ${reason}`);
  }

  // Marine is optional - log error but continue
  let marine: OpenMeteoMarineResponse | null = null;
  if (marineResult.status === 'fulfilled') {
    marine = marineResult.value;
  } else {
    console.warn('[coastal-conditions] Marine data unavailable:', marineResult.reason);
  }

  return processCoastalConditions(weatherResult.value, marine);
}
