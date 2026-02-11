/**
 * Custom hook for fetching marine heatwave alerts.
 *
 * Tries the backend data service first, then falls back to direct
 * Copernicus WMTS queries, and finally to climatological estimation.
 */

import { useQuery } from '@tanstack/react-query';

export type HeatwaveCategory = 'none' | 'moderate' | 'strong' | 'severe' | 'extreme';

export interface MarineHeatwaveAlert {
  mpa_id: string;
  active: boolean;
  category: HeatwaveCategory;
  current_sst: number | null;
  climatological_mean: number | null;
  threshold_90th: number | null;
  anomaly: number | null;
  intensity_ratio: number | null;
  duration_days: number | null;
  ecological_impact: string;
  recommendations: string[];
  detected_at: string;
}

export interface UseHeatwaveAlertResult {
  alert: MarineHeatwaveAlert | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const DATA_SERVICE_URL = process.env.NEXT_PUBLIC_DATA_SERVICE_URL || 'http://localhost:8000';

/**
 * Try fetching from the backend data service.
 */
async function fetchFromBackend(
  mpaId: string,
  lat: number,
  lon: number,
): Promise<MarineHeatwaveAlert> {
  const url = new URL(`${DATA_SERVICE_URL}/api/v1/heatwave/${mpaId}`);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch current SST directly from Copernicus WMTS GetFeatureInfo.
 * This endpoint is public, CORS-enabled, and requires no authentication.
 */
async function fetchSSTFromCopernicus(lat: number, lon: number): Promise<number | null> {
  try {
    // Calculate tile coordinates at zoom level 5
    const zoom = 5;
    const n = Math.pow(2, zoom);
    const tileCol = Math.floor(((lon + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const tileRow = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    );

    // Calculate pixel position within tile
    const tileLonMin = (tileCol / n) * 360 - 180;
    const tileLonMax = ((tileCol + 1) / n) * 360 - 180;
    const pixelX = Math.floor(((lon - tileLonMin) / (tileLonMax - tileLonMin)) * 256);

    const tileLatMax = (Math.atan(Math.sinh(Math.PI * (1 - (2 * tileRow) / n))) * 180) / Math.PI;
    const tileLatMin =
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileRow + 1)) / n))) * 180) / Math.PI;
    const pixelY = Math.floor(((tileLatMax - lat) / (tileLatMax - tileLatMin)) * 256);

    const params = new URLSearchParams({
      SERVICE: 'WMTS',
      REQUEST: 'GetFeatureInfo',
      LAYER:
        'SST_GLO_SST_L4_NRT_OBSERVATIONS_010_001/METOFFICE-GLO-SST-L4-NRT-OBS-SST-V2/analysed_sst',
      TILEMATRIXSET: 'EPSG:3857',
      TILEMATRIX: zoom.toString(),
      TILEROW: tileRow.toString(),
      TILECOL: tileCol.toString(),
      I: Math.max(0, Math.min(255, pixelX)).toString(),
      J: Math.max(0, Math.min(255, pixelY)).toString(),
      INFOFORMAT: 'application/json',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(
        `https://wmts.marine.copernicus.eu/teroWmts?${params.toString()}`,
        { signal: controller.signal },
      );

      if (!response.ok) return null;

      const data = await response.json();
      const features = data?.features;
      if (features && features.length > 0) {
        const value = features[0]?.properties?.value;
        if (value != null) {
          // Convert from Kelvin to Celsius
          return Number(value) - 273.15;
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Estimate SST from latitude and time of year (climatological fallback).
 * Mirrors the backend's _estimate_sst method.
 */
function estimateSST(lat: number): number {
  const absLat = Math.abs(lat);
  const baseSst = 28 - (absLat / 90) * 30;

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  let seasonalFactor = Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);
  if (lat < 0) seasonalFactor = -seasonalFactor;

  const seasonalAmplitude = Math.min(absLat / 30, 1) * 4;
  const sst = baseSst + seasonalFactor * seasonalAmplitude;

  return Math.max(-2, Math.min(32, sst));
}

/**
 * Get 90th percentile threshold for heatwave classification.
 */
function getThreshold90th(lat: number): number {
  const absLat = Math.abs(lat);
  const mean = estimateSST(lat);

  let thresholdDiff: number;
  if (absLat < 25) thresholdDiff = 1.0;
  else if (absLat < 50) thresholdDiff = 2.0;
  else thresholdDiff = 1.5;

  return mean + thresholdDiff;
}

/**
 * Classify heatwave and build alert object (Hobday et al. 2018).
 */
function classifyHeatwave(
  mpaId: string,
  currentSst: number,
  lat: number,
  isFromSatellite: boolean,
): MarineHeatwaveAlert {
  const climatologicalMean = estimateSST(lat);
  const threshold90th = getThreshold90th(lat);
  const anomaly = currentSst - climatologicalMean;
  const thresholdDiff = threshold90th - climatologicalMean;
  const intensityRatio = thresholdDiff > 0 ? anomaly / thresholdDiff : 0;

  let category: HeatwaveCategory;
  let active: boolean;
  let ecologicalImpact: string;
  let recommendations: string[];
  let durationDays: number | null = null;

  if (intensityRatio < 1.0) {
    category = 'none';
    active = false;
    ecologicalImpact = 'No thermal stress detected. Normal conditions for this time of year.';
    recommendations = [];
  } else if (intensityRatio < 2.0) {
    category = 'moderate';
    active = true;
    ecologicalImpact =
      'Moderate thermal stress may affect temperature-sensitive species. ' +
      'Some coral bleaching possible in tropical waters. ' +
      'Fish may seek deeper, cooler waters.';
    recommendations = [
      'Monitor coral health in tropical MPAs',
      'Track fish distribution changes',
      'Document any unusual species behavior',
    ];
  } else if (intensityRatio < 3.0) {
    category = 'strong';
    active = true;
    ecologicalImpact =
      'Significant thermal stress expected. ' +
      'Elevated coral bleaching risk. ' +
      'Marine mammals and seabirds may experience prey availability changes. ' +
      'Harmful algal blooms more likely.';
    recommendations = [
      'Increase monitoring frequency for bleaching events',
      'Survey key indicator species',
      'Alert local marine authorities',
      'Monitor for harmful algal blooms',
    ];
  } else if (intensityRatio < 4.0) {
    category = 'severe';
    active = true;
    ecologicalImpact =
      'Severe thermal stress. ' +
      'High probability of mass coral bleaching. ' +
      'Fish kills possible in shallow areas. ' +
      'Significant ecosystem disruption expected. ' +
      'Marine wildlife may exhibit unusual migration patterns.';
    recommendations = [
      'Implement emergency monitoring protocols',
      'Document bleaching extent and mortality',
      'Coordinate with regional conservation networks',
      'Consider temporary fishing restrictions',
      'Prepare for potential wildlife strandings',
    ];
  } else {
    category = 'extreme';
    active = true;
    ecologicalImpact =
      'Extreme thermal stress with catastrophic potential. ' +
      'Mass mortality events likely across multiple taxa. ' +
      'Ecosystem-wide impacts expected. ' +
      'Recovery may take years to decades.';
    recommendations = [
      'Activate emergency response protocols',
      'Conduct rapid ecological assessments',
      'Document mortality events for scientific record',
      'Engage emergency wildlife response teams',
      'Coordinate regional/international response',
      'Consider all protective measures available',
    ];
  }

  if (active) {
    durationDays = Math.min(Math.round(5 + intensityRatio * 5), 30);
  }

  if (!isFromSatellite) {
    ecologicalImpact +=
      ' (Based on climatological estimates; satellite data was unavailable.)';
  }

  return {
    mpa_id: mpaId,
    active,
    category,
    current_sst: Math.round(currentSst * 10) / 10,
    climatological_mean: Math.round(climatologicalMean * 10) / 10,
    threshold_90th: Math.round(threshold90th * 10) / 10,
    anomaly: Math.round(anomaly * 100) / 100,
    intensity_ratio: Math.round(intensityRatio * 100) / 100,
    duration_days: durationDays,
    ecological_impact: ecologicalImpact,
    recommendations,
    detected_at: new Date().toISOString(),
  };
}

/**
 * Fetch heatwave alert with cascading fallback:
 * 1. Backend data service (has full Copernicus integration)
 * 2. Direct Copernicus WMTS query (satellite SST + client-side classification)
 * 3. Climatological estimation (latitude-based SST + client-side classification)
 */
async function fetchHeatwaveAlert(
  mpaId: string,
  lat: number,
  lon: number,
): Promise<MarineHeatwaveAlert> {
  // Try backend first
  try {
    return await fetchFromBackend(mpaId, lat, lon);
  } catch {
    // Backend unavailable, continue to fallbacks
  }

  // Try direct Copernicus WMTS query
  const satelliteSst = await fetchSSTFromCopernicus(lat, lon);
  if (satelliteSst !== null) {
    return classifyHeatwave(mpaId, satelliteSst, lat, true);
  }

  // Fall back to climatological estimation
  const estimatedSst = estimateSST(lat);
  return classifyHeatwave(mpaId, estimatedSst, lat, false);
}

/**
 * Hook to fetch marine heatwave alert for an MPA.
 *
 * Falls back gracefully from backend to direct Copernicus queries
 * to climatological estimation, so data is always available.
 */
export function useHeatwaveAlert(
  mpaId: string | undefined,
  lat: number | undefined,
  lon: number | undefined,
  enabled: boolean = true,
): UseHeatwaveAlertResult {
  const {
    data: alert,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['heatwave-alert', mpaId, lat, lon],
    queryFn: () => fetchHeatwaveAlert(mpaId!, lat!, lon!),
    enabled: enabled && !!mpaId && lat !== undefined && lon !== undefined,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  return {
    alert: alert ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
