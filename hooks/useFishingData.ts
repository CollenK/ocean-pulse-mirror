/**
 * useFishingData Hook
 *
 * Custom hook for fetching and managing Global Fishing Watch data for MPAs.
 * Handles fishing effort, vessel activity, compliance scores, and IUU risk.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GFWFishingEffortSummary,
  GFWVesselActivity,
  GFWComplianceScore,
  GFWIUURiskAssessment,
  GFWRegion,
} from '@/types/gfw';
import type { MPAGeometry } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface FishingDataSummary {
  fishingEffort: GFWFishingEffortSummary | null;
  vesselActivity: GFWVesselActivity[];
  compliance: GFWComplianceScore | null;
  iuuRisk: GFWIUURiskAssessment | null;
}

export interface UseFishingDataOptions {
  mpaId: string;
  geometry?: MPAGeometry | null;
  bounds?: number[][] | null;
  protectionLevel?: string;
  establishedYear?: number;
  enabled?: boolean;
  // Note: activityDays removed - vessel activity requires vessel IDs (Events API limitation)
}

export interface UseFishingDataReturn {
  data: FishingDataSummary;
  loading: boolean;
  error: Error | null;
  progress: number;
  refetch: () => Promise<void>;
  isConfigured: boolean;
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  data: FishingDataSummary;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (GFW data updates every 72-96 hours)

function getCacheKey(mpaId: string): string {
  return `gfw_${mpaId}`;
}

function getCachedData(mpaId: string): FishingDataSummary | null {
  const key = getCacheKey(mpaId);
  const entry = cache.get(key);

  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }

  return null;
}

function setCachedData(mpaId: string, data: FishingDataSummary): void {
  const key = getCacheKey(mpaId);
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Local Calculations (Avoid extra API calls)
// ============================================================================

/**
 * Calculate IUU risk locally from fishing effort data to avoid extra API calls.
 * Returns null if there's insufficient data to make a meaningful assessment.
 */
function calculateIUURiskLocally(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment | null {
  const totalHours = fishingEffort.totalFishingHours;
  const vesselCount = fishingEffort.totalVessels;

  // If no fishing data, we can't assess IUU risk - could be no coverage or no activity
  // Don't show misleading "low risk" when we simply have no data
  if (totalHours === 0 && vesselCount === 0) {
    return null;
  }

  // Risk factors based on fishing patterns
  const factors: GFWIUURiskAssessment['factors'] = [];

  // High fishing hours in MPA could indicate compliance issues
  if (totalHours > 1000) {
    factors.push({
      type: 'high_fishing_activity',
      description: 'High fishing activity detected in MPA',
      count: Math.round(totalHours),
      severity: totalHours > 5000 ? 'high' : 'medium',
    });
  }

  // Multiple flag states could indicate transshipment risk
  if (fishingEffort.byFlag.length > 5) {
    factors.push({
      type: 'multiple_flags',
      description: 'Vessels from multiple flag states',
      count: fishingEffort.byFlag.length,
      severity: fishingEffort.byFlag.length > 10 ? 'high' : 'medium',
    });
  }

  // Calculate risk score (0-100)
  let riskScore = 0;
  if (totalHours > 0) {
    riskScore = Math.min(50, totalHours / 100);
    riskScore += Math.min(30, fishingEffort.byFlag.length * 3);
    riskScore += Math.min(20, vesselCount);
  }

  const normalizedScore = Math.min(100, Math.round(riskScore));

  // Determine risk level
  let riskLevel: GFWIUURiskAssessment['riskLevel'];
  if (normalizedScore >= 70) {
    riskLevel = 'critical';
  } else if (normalizedScore >= 40) {
    riskLevel = 'high';
  } else if (normalizedScore >= 20) {
    riskLevel = 'moderate';
  } else {
    riskLevel = 'low';
  }

  return {
    mpaId,
    riskLevel,
    riskScore: normalizedScore,
    factors,
    vesselCount,
    highRiskVesselCount: 0,
    lastUpdated: Date.now(),
  };
}

/**
 * Calculate compliance score locally from fishing effort data.
 * Returns null if there's insufficient data to make a meaningful assessment.
 * This avoids making a separate API call for compliance.
 */
function calculateComplianceLocally(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary,
  protectionLevel: string,
  establishedYear?: number
): GFWComplianceScore | null {
  const totalFishingHours = fishingEffort.totalFishingHours;
  const totalVessels = fishingEffort.totalVessels;

  // If no fishing data, we can't assess compliance - could be no GFW coverage or no activity
  // Don't show misleading "100% compliance" when we simply have no data
  if (totalFishingHours === 0 && totalVessels === 0) {
    return null;
  }

  // Calculate compliance based on protection level
  let score: number;
  let violations = 0;

  const isNoTake = protectionLevel.toLowerCase().includes('no-take') ||
                   protectionLevel.toLowerCase().includes('no take') ||
                   protectionLevel.toLowerCase().includes('strict');

  if (isNoTake) {
    // No-take zones: any fishing is a violation
    violations = totalVessels;
    score = totalFishingHours === 0 ? 100 : Math.max(0, 100 - (totalFishingHours * 0.5));
  } else {
    // Partial protection: base score on fishing intensity
    // Lower fishing hours = better compliance
    // Using a baseline of 1000 hours per year as "moderate"
    const intensityRatio = Math.min(1, totalFishingHours / 1000);
    score = Math.max(0, 100 - (intensityRatio * 50));
    violations = Math.floor(totalFishingHours / 500);
  }

  // Calculate trend from monthly data if available
  let trend: GFWComplianceScore['trend'] = 'stable';
  const monthlyTrend = fishingEffort.monthlyTrend;
  if (monthlyTrend && monthlyTrend.length >= 6) {
    const recentMonths = monthlyTrend.slice(-3);
    const earlierMonths = monthlyTrend.slice(-6, -3);

    const recentAvg = recentMonths.reduce((sum, m) => sum + m.fishingHours, 0) / recentMonths.length;
    const earlierAvg = earlierMonths.reduce((sum, m) => sum + m.fishingHours, 0) / earlierMonths.length;

    if (earlierAvg > 0) {
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
      if (change < -20) trend = 'improving';
      else if (change > 20) trend = 'declining';
    }
  }

  // Calculate protection effectiveness (simplified)
  let protectionEffectiveness = 0;
  if (establishedYear) {
    const yearsProtected = new Date().getFullYear() - establishedYear;
    // Longer protection typically means better enforcement
    protectionEffectiveness = Math.min(75, 25 + (yearsProtected * 5));
  }

  // Determine confidence based on data availability
  const confidence: GFWComplianceScore['confidence'] =
    monthlyTrend && monthlyTrend.length >= 12 ? 'high' :
    monthlyTrend && monthlyTrend.length >= 6 ? 'medium' : 'low';

  return {
    mpaId,
    score: Math.round(score),
    fishingHoursInside: totalFishingHours,
    fishingHoursBuffer: 0, // Not calculating buffer to reduce API calls
    violations,
    trend,
    confidence,
    protectionEffectiveness,
    lastUpdated: Date.now(),
  };
}

// ============================================================================
// API Helpers
// ============================================================================

async function fetchFromAPI<T>(
  action: string,
  params: Record<string, unknown>
): Promise<T> {
  console.log(`[useFishingData] Fetching ${action} with params:`, {
    mpaId: params.mpaId,
    hasGeometry: !!params.geometry,
    hasBounds: !!params.bounds,
  });

  const response = await fetch('/api/gfw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });

  if (!response.ok) {
    // Try to get error as JSON first, then as text
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    let errorDetails = '';

    try {
      const text = await response.text();
      console.error(`[useFishingData] Raw response for ${action}:`, text.substring(0, 500));

      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details || '';
      } catch {
        errorDetails = text.substring(0, 200);
      }
    } catch (e) {
      console.error(`[useFishingData] Could not read response body:`, e);
    }

    console.error(`[useFishingData] API error for ${action}:`, {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      errorDetails,
    });

    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result.data as T;
}

async function checkGFWConfigured(): Promise<boolean> {
  try {
    const response = await fetch('/api/gfw?action=health-check&mpaId=test');
    if (!response.ok) return false;
    const result = await response.json();
    return result.data?.configured === true;
  } catch {
    return false;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useFishingData({
  mpaId,
  geometry,
  bounds,
  protectionLevel,
  establishedYear,
  enabled = true,
}: UseFishingDataOptions): UseFishingDataReturn {
  const [data, setData] = useState<FishingDataSummary>({
    fishingEffort: null,
    vesselActivity: [],
    compliance: null,
    iuuRisk: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [isConfigured, setIsConfigured] = useState(true);

  const fetchedRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Convert geometry to GFW region format
  const getRegionParams = useCallback((): { geometry?: MPAGeometry; bounds?: number[][] } => {
    if (geometry) {
      return { geometry };
    }
    if (bounds) {
      return { bounds };
    }
    return {};
  }, [geometry, bounds]);

  // Check if we have valid geometry
  const hasValidGeometry = !!(geometry || (bounds && bounds.length >= 2));

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!mpaId || !hasValidGeometry || !enabled) {
      return;
    }

    // PHASE 2: Stale-while-revalidate pattern
    // Show cached data immediately while refetching in background
    const cached = getCachedData(mpaId);
    if (cached) {
      setData(cached);
      setProgress(100);
      // If not forcing refresh, just return cached data
      if (!forceRefresh) {
        return;
      }
      // Otherwise continue to refetch in background (don't show loading state)
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Only show loading state if we don't have cached data
    if (!cached) {
      setLoading(true);
      setError(null);
      setProgress(0);
    }

    const regionParams = getRegionParams();

    try {
      // Check if GFW is configured
      const configured = await checkGFWConfigured();
      setIsConfigured(configured);

      if (!configured) {
        setLoading(false);
        setProgress(100);
        return;
      }

      if (!cached) setProgress(10);

      // PHASE 1: Optimized - Only ONE API call for fishing effort
      // All other metrics are calculated locally from this data
      const results: FishingDataSummary = {
        fishingEffort: null,
        vesselActivity: [], // Vessel activity not available (Events API requires vessel IDs)
        compliance: null,
        iuuRisk: null,
      };

      // Fishing effort (the only API call needed)
      console.log('[useFishingData] Fetching fishing effort (single API call)...');
      try {
        results.fishingEffort = await fetchFromAPI<GFWFishingEffortSummary>(
          'fishing-effort',
          { mpaId, ...regionParams }
        );
        if (!cached) setProgress(70);

        // Calculate compliance and IUU risk locally from fishing effort data
        // This avoids 2 additional API calls and rate limiting issues
        if (protectionLevel) {
          results.compliance = calculateComplianceLocally(
            mpaId,
            results.fishingEffort,
            protectionLevel,
            establishedYear
          );
        }
        if (!cached) setProgress(85);

        results.iuuRisk = calculateIUURiskLocally(mpaId, results.fishingEffort);
        if (!cached) setProgress(95);

      } catch (err) {
        console.error('[useFishingData] Error fetching fishing effort:', err);

        // If we have cached data, silently fail and keep using cache
        if (cached) {
          console.log('[useFishingData] Using cached data after fetch error');
          return;
        }

        // No cached data - show error to user
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        let errorMsg: string;
        if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('Connection loss')) {
          errorMsg = 'Global Fishing Watch service is temporarily unavailable. Fishing data will load when the service recovers.';
        } else if (errorMessage.includes('422')) {
          errorMsg = 'Global Fishing Watch API format error. The API may have changed.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          errorMsg = 'Global Fishing Watch API authentication failed.';
        } else if (errorMessage.includes('429')) {
          errorMsg = 'Rate limited by Global Fishing Watch. Please wait a moment and try again.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          errorMsg = 'Global Fishing Watch request timed out. The service may be busy.';
        } else {
          errorMsg = 'Unable to load fishing data. The Global Fishing Watch service may be experiencing issues.';
        }

        setError(new Error(errorMsg));
        setProgress(100);
        return;
      }

      // Cache and set results
      setCachedData(mpaId, results);
      setData(results);
      setProgress(100);
      fetchedRef.current = mpaId;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      console.error('[useFishingData] Error:', err);
      // Keep cached data if available
      if (!cached) {
        setError(err instanceof Error ? err : new Error('Failed to fetch fishing data'));
      }
    } finally {
      setLoading(false);
    }
  }, [mpaId, hasValidGeometry, enabled, getRegionParams, protectionLevel, establishedYear]);

  // Initial fetch
  useEffect(() => {
    if (enabled && hasValidGeometry && fetchedRef.current !== mpaId) {
      fetchData();
    }
  }, [enabled, hasValidGeometry, mpaId, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(async () => {
    fetchedRef.current = null;
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    progress,
    refetch,
    isConfigured,
  };
}

// ============================================================================
// Individual Data Hooks (for more granular control)
// ============================================================================

export interface UseFishingEffortOptions {
  mpaId: string;
  geometry?: MPAGeometry | null;
  bounds?: number[][] | null;
  enabled?: boolean;
}

export function useFishingEffort({
  mpaId,
  geometry,
  bounds,
  enabled = true,
}: UseFishingEffortOptions) {
  const [data, setData] = useState<GFWFishingEffortSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasValidGeometry = !!(geometry || (bounds && bounds.length >= 2));

  useEffect(() => {
    if (!mpaId || !hasValidGeometry || !enabled) {
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFromAPI<GFWFishingEffortSummary>(
          'fishing-effort',
          {
            mpaId,
            ...(geometry ? { geometry } : { bounds }),
          }
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch fishing effort'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, [mpaId, geometry, bounds, hasValidGeometry, enabled]);

  return { data, loading, error };
}

export interface UseVesselActivityOptions {
  mpaId: string;
  geometry?: MPAGeometry | null;
  bounds?: number[][] | null;
  days?: number;
  enabled?: boolean;
}

/**
 * @deprecated This hook is not functional - the GFW Events API requires vessel IDs,
 * not region-based queries. Use useFishingData() instead for fishing effort data.
 * Vessel activity tracking would require a two-step process:
 * 1. Get vessel IDs from fishing effort data
 * 2. Query Events API with those vessel IDs
 * This is deferred for future implementation.
 */
export function useVesselActivity({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mpaId: _mpaId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  geometry: _geometry,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bounds: _bounds,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  days: _days = 30,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enabled: _enabled = true,
}: UseVesselActivityOptions) {
  // Return empty data - vessel activity requires vessel IDs (Events API limitation)
  console.warn('[useVesselActivity] This hook is deprecated. GFW Events API requires vessel IDs, not regions.');
  return { data: [] as GFWVesselActivity[], loading: false, error: null };
}

export interface UseComplianceScoreOptions {
  mpaId: string;
  geometry?: MPAGeometry | null;
  bounds?: number[][] | null;
  protectionLevel: string;
  establishedYear?: number;
  enabled?: boolean;
}

/**
 * @deprecated Use useFishingData() instead - it calculates compliance locally
 * from fishing effort data, avoiding an extra API call.
 * This hook makes a separate API call for compliance calculation.
 */
export function useComplianceScore({
  mpaId,
  geometry,
  bounds,
  protectionLevel,
  establishedYear,
  enabled = true,
}: UseComplianceScoreOptions) {
  // Use useFishingData internally to get compliance calculated locally
  const { data, loading, error } = useFishingData({
    mpaId,
    geometry,
    bounds,
    protectionLevel,
    establishedYear,
    enabled,
  });

  return { data: data.compliance, loading, error };
}

export interface UseIUURiskOptions {
  mpaId: string;
  geometry?: MPAGeometry | null;
  bounds?: number[][] | null;
  days?: number;
  enabled?: boolean;
}

/**
 * @deprecated Use useFishingData() instead - it calculates IUU risk locally
 * from fishing effort data, avoiding an extra API call.
 * This hook previously made a separate API call for IUU risk.
 */
export function useIUURisk({
  mpaId,
  geometry,
  bounds,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  days: _days = 90,
  enabled = true,
}: UseIUURiskOptions) {
  // Use useFishingData internally to get IUU risk calculated locally
  const { data, loading, error } = useFishingData({
    mpaId,
    geometry,
    bounds,
    enabled,
  });

  return { data: data.iuuRisk, loading, error };
}

// ============================================================================
// Background Pre-fetch for Saved MPAs (Phase 2)
// ============================================================================

interface PrefetchableMPA {
  id: string;
  geometry?: { type: string; coordinates: unknown } | null;
  bounds?: number[][] | null;
  protectionLevel?: string;
  establishedYear?: number;
}

/**
 * Pre-fetch fishing data for multiple MPAs in the background.
 * This is used to warm the cache for saved MPAs so data loads instantly.
 * Fetches sequentially to avoid rate limiting (GFW allows 1 concurrent request).
 */
export async function prefetchFishingDataForMPAs(
  mpas: PrefetchableMPA[],
  options?: { maxConcurrent?: number; delayMs?: number }
): Promise<void> {
  const { delayMs = 2000 } = options || {};

  console.log(`[prefetchFishingData] Pre-fetching data for ${mpas.length} saved MPAs...`);

  for (const mpa of mpas) {
    // Skip if already cached
    const cached = getCachedData(mpa.id);
    if (cached) {
      console.log(`[prefetchFishingData] Skipping ${mpa.id} (already cached)`);
      continue;
    }

    // Skip if no geometry
    if (!mpa.geometry && !mpa.bounds) {
      console.log(`[prefetchFishingData] Skipping ${mpa.id} (no geometry)`);
      continue;
    }

    try {
      console.log(`[prefetchFishingData] Fetching data for ${mpa.id}...`);

      const result = await fetchFromAPI<GFWFishingEffortSummary>(
        'fishing-effort',
        {
          mpaId: mpa.id,
          ...(mpa.geometry ? { geometry: mpa.geometry } : { bounds: mpa.bounds }),
        }
      );

      // Calculate compliance and IUU risk locally
      const fishingData: FishingDataSummary = {
        fishingEffort: result,
        vesselActivity: [],
        compliance: mpa.protectionLevel
          ? calculateComplianceLocally(mpa.id, result, mpa.protectionLevel, mpa.establishedYear)
          : null,
        iuuRisk: calculateIUURiskLocally(mpa.id, result),
      };

      // Cache the result
      setCachedData(mpa.id, fishingData);
      console.log(`[prefetchFishingData] Cached data for ${mpa.id}`);

      // Delay between requests to avoid rate limiting
      if (mpas.indexOf(mpa) < mpas.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      console.warn(`[prefetchFishingData] Failed to prefetch ${mpa.id}:`, err);
      // Continue with other MPAs even if one fails
    }
  }

  console.log('[prefetchFishingData] Pre-fetch complete');
}

/**
 * Hook to pre-fetch fishing data for saved MPAs in the background.
 * Call this from a provider or layout component to warm the cache.
 */
export function usePrefetchSavedMPAsData(savedMPAs: PrefetchableMPA[], enabled = true) {
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || savedMPAs.length === 0) return;

    // Filter to only MPAs we haven't tried to prefetch yet
    const toPrefetch = savedMPAs.filter(mpa => !prefetchedRef.current.has(mpa.id));

    if (toPrefetch.length === 0) return;

    // Mark as prefetched to avoid duplicate attempts
    toPrefetch.forEach(mpa => prefetchedRef.current.add(mpa.id));

    // Run prefetch in background (don't await)
    prefetchFishingDataForMPAs(toPrefetch).catch(err => {
      console.warn('[usePrefetchSavedMPAsData] Background prefetch error:', err);
    });
  }, [savedMPAs, enabled]);
}
