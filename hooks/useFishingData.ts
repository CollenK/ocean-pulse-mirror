import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GFWFishingEffortSummary,
  GFWVesselActivity,
  GFWComplianceScore,
  GFWIUURiskAssessment,
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

function computeIUURiskFactors(
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment['factors'] {
  const factors: GFWIUURiskAssessment['factors'] = [];

  if (fishingEffort.totalFishingHours > 1000) {
    factors.push({
      type: 'high_fishing_activity',
      description: 'High fishing activity detected in MPA',
      count: Math.round(fishingEffort.totalFishingHours),
      severity: fishingEffort.totalFishingHours > 5000 ? 'high' : 'medium',
    });
  }

  if (fishingEffort.byFlag.length > 5) {
    factors.push({
      type: 'multiple_flags',
      description: 'Vessels from multiple flag states',
      count: fishingEffort.byFlag.length,
      severity: fishingEffort.byFlag.length > 10 ? 'high' : 'medium',
    });
  }

  return factors;
}

function computeIUURiskScore(fishingEffort: GFWFishingEffortSummary): number {
  const { totalFishingHours, totalVessels, byFlag } = fishingEffort;
  if (totalFishingHours <= 0) return 0;

  let riskScore = Math.min(50, totalFishingHours / 100);
  riskScore += Math.min(30, byFlag.length * 3);
  riskScore += Math.min(20, totalVessels);
  return Math.min(100, Math.round(riskScore));
}

function scoreToRiskLevel(score: number): GFWIUURiskAssessment['riskLevel'] {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'moderate';
  return 'low';
}

/**
 * Calculate IUU risk locally from fishing effort data to avoid extra API calls.
 * Returns null if there's insufficient data to make a meaningful assessment.
 */
function calculateIUURiskLocally(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary
): GFWIUURiskAssessment | null {
  if (fishingEffort.totalFishingHours === 0 && fishingEffort.totalVessels === 0) {
    return null;
  }

  const riskScore = computeIUURiskScore(fishingEffort);

  return {
    mpaId,
    riskLevel: scoreToRiskLevel(riskScore),
    riskScore,
    factors: computeIUURiskFactors(fishingEffort),
    vesselCount: fishingEffort.totalVessels,
    highRiskVesselCount: 0,
    lastUpdated: Date.now(),
  };
}

function computeComplianceBase(
  totalFishingHours: number,
  totalVessels: number,
  protectionLevel: string
): { score: number; violations: number } {
  const isNoTake = protectionLevel.toLowerCase().includes('no-take') ||
                   protectionLevel.toLowerCase().includes('no take') ||
                   protectionLevel.toLowerCase().includes('strict');

  if (isNoTake) {
    return {
      violations: totalVessels,
      score: totalFishingHours === 0 ? 100 : Math.max(0, 100 - (totalFishingHours * 0.5)),
    };
  }

  const intensityRatio = Math.min(1, totalFishingHours / 1000);
  return {
    score: Math.max(0, 100 - (intensityRatio * 50)),
    violations: Math.floor(totalFishingHours / 500),
  };
}

function computeComplianceTrend(
  monthlyTrend?: GFWFishingEffortSummary['monthlyTrend']
): GFWComplianceScore['trend'] {
  if (!monthlyTrend || monthlyTrend.length < 6) return 'stable';

  const recentAvg = monthlyTrend.slice(-3).reduce((s, m) => s + m.fishingHours, 0) / 3;
  const earlierAvg = monthlyTrend.slice(-6, -3).reduce((s, m) => s + m.fishingHours, 0) / 3;

  if (earlierAvg <= 0) return 'stable';

  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  if (change < -20) return 'improving';
  if (change > 20) return 'declining';
  return 'stable';
}

/**
 * Calculate compliance score locally from fishing effort data.
 * Returns null if there's insufficient data to make a meaningful assessment.
 */
function calculateComplianceLocally(
  mpaId: string,
  fishingEffort: GFWFishingEffortSummary,
  protectionLevel: string,
  establishedYear?: number
): GFWComplianceScore | null {
  if (fishingEffort.totalFishingHours === 0 && fishingEffort.totalVessels === 0) {
    return null;
  }

  const { score, violations } = computeComplianceBase(
    fishingEffort.totalFishingHours,
    fishingEffort.totalVessels,
    protectionLevel
  );

  let protectionEffectiveness = 0;
  if (establishedYear) {
    const yearsProtected = new Date().getFullYear() - establishedYear;
    protectionEffectiveness = Math.min(75, 25 + (yearsProtected * 5));
  }

  const monthlyTrend = fishingEffort.monthlyTrend;
  const confidence: GFWComplianceScore['confidence'] =
    monthlyTrend && monthlyTrend.length >= 12 ? 'high' :
    monthlyTrend && monthlyTrend.length >= 6 ? 'medium' : 'low';

  return {
    mpaId,
    score: Math.round(score),
    fishingHoursInside: fishingEffort.totalFishingHours,
    fishingHoursBuffer: 0,
    violations,
    trend: computeComplianceTrend(monthlyTrend),
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
    const errorMessage = await parseAPIError(action, response);
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result.data as T;
}

async function parseAPIError(action: string, response: Response): Promise<string> {
  let errorMessage = `API error: ${response.status} ${response.statusText}`;

  try {
    const text = await response.text();
    console.error(`[useFishingData] Raw response for ${action}:`, text.substring(0, 500));

    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Not JSON, keep default message
    }
  } catch (e) {
    console.error(`[useFishingData] Could not read response body:`, e);
  }

  return errorMessage;
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
// Fetch Error Message Mapping
// ============================================================================

const FETCH_ERROR_MATCHERS: Array<{ test: (msg: string) => boolean; message: string }> = [
  {
    test: (msg) => msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('Connection loss'),
    message: 'Global Fishing Watch service is temporarily unavailable. Fishing data will load when the service recovers.',
  },
  {
    test: (msg) => msg.includes('422'),
    message: 'Global Fishing Watch API format error. The API may have changed.',
  },
  {
    test: (msg) => msg.includes('401') || msg.includes('403'),
    message: 'Global Fishing Watch API authentication failed.',
  },
  {
    test: (msg) => msg.includes('429'),
    message: 'Rate limited by Global Fishing Watch. Please wait a moment and try again.',
  },
  {
    test: (msg) => msg.includes('timeout') || msg.includes('Timeout'),
    message: 'Global Fishing Watch request timed out. The service may be busy.',
  },
];

function mapFetchErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Unknown error';

  for (const matcher of FETCH_ERROR_MATCHERS) {
    if (matcher.test(msg)) return matcher.message;
  }

  return 'Unable to load fishing data. The Global Fishing Watch service may be experiencing issues.';
}

// ============================================================================
// Core Fetch Logic (extracted from hook)
// ============================================================================

interface FetchContext {
  mpaId: string;
  regionParams: { geometry?: MPAGeometry; bounds?: number[][] };
  protectionLevel?: string;
  establishedYear?: number;
}

async function fetchFishingEffortData(ctx: FetchContext): Promise<FishingDataSummary> {
  console.log('[useFishingData] Fetching fishing effort (single API call)...');

  const results: FishingDataSummary = {
    fishingEffort: null,
    vesselActivity: [],
    compliance: null,
    iuuRisk: null,
  };

  results.fishingEffort = await fetchFromAPI<GFWFishingEffortSummary>(
    'fishing-effort',
    { mpaId: ctx.mpaId, ...ctx.regionParams }
  );

  if (ctx.protectionLevel) {
    results.compliance = calculateComplianceLocally(
      ctx.mpaId,
      results.fishingEffort,
      ctx.protectionLevel,
      ctx.establishedYear
    );
  }

  results.iuuRisk = calculateIUURiskLocally(ctx.mpaId, results.fishingEffort);

  return results;
}

// ============================================================================
// Hook State Helpers
// ============================================================================

interface HookState {
  setData: (d: FishingDataSummary) => void;
  setLoading: (l: boolean) => void;
  setError: (e: Error | null) => void;
  setProgress: (p: number) => void;
  setIsConfigured: (c: boolean) => void;
}

const EMPTY_DATA: FishingDataSummary = {
  fishingEffort: null,
  vesselActivity: [],
  compliance: null,
  iuuRisk: null,
};

/**
 * Attempt to serve from cache. Returns the cached data if found, or null.
 * If forceRefresh is false and cache hit, signals the caller to stop.
 */
function serveCacheIfAvailable(
  mpaId: string,
  forceRefresh: boolean,
  state: Pick<HookState, 'setData' | 'setProgress'>
): { cached: FishingDataSummary | null; shouldStop: boolean } {
  const cached = getCachedData(mpaId);
  if (!cached) return { cached: null, shouldStop: false };

  state.setData(cached);
  state.setProgress(100);
  return { cached, shouldStop: !forceRefresh };
}

/**
 * Execute the main fetch pipeline: check config, fetch data, calculate derived metrics.
 */
async function executeFetchPipeline(
  ctx: FetchContext,
  hasCached: boolean,
  state: HookState,
  fetchedRef: React.RefObject<string | null>
): Promise<void> {
  const configured = await checkGFWConfigured();
  state.setIsConfigured(configured);

  if (!configured) {
    state.setLoading(false);
    state.setProgress(100);
    return;
  }

  if (!hasCached) state.setProgress(10);

  const results = await fetchFishingEffortData(ctx);
  if (!hasCached) state.setProgress(95);

  setCachedData(ctx.mpaId, results);
  state.setData(results);
  state.setProgress(100);
  (fetchedRef as React.MutableRefObject<string | null>).current = ctx.mpaId;
}

/**
 * Handle errors from the fetch pipeline.
 */
function handleFetchError(
  err: unknown,
  hasCached: boolean,
  state: Pick<HookState, 'setError' | 'setProgress'>
): void {
  console.error('[useFishingData] Error fetching fishing effort:', err);

  if (hasCached) {
    console.log('[useFishingData] Using cached data after fetch error');
    return;
  }

  state.setError(new Error(mapFetchErrorMessage(err)));
  state.setProgress(100);
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
  const [data, setData] = useState<FishingDataSummary>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [isConfigured, setIsConfigured] = useState(true);

  const fetchedRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const state: HookState = { setData, setLoading, setError, setProgress, setIsConfigured };

  const getRegionParams = useCallback((): { geometry?: MPAGeometry; bounds?: number[][] } => {
    if (geometry) return { geometry };
    if (bounds) return { bounds };
    return {};
  }, [geometry, bounds]);

  const hasValidGeometry = !!(geometry || (bounds && bounds.length >= 2));

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!mpaId || !hasValidGeometry || !enabled) return;

    const { cached, shouldStop } = serveCacheIfAvailable(mpaId, forceRefresh, state);
    if (shouldStop) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    if (!cached) {
      setLoading(true);
      setError(null);
      setProgress(0);
    }

    const ctx: FetchContext = {
      mpaId,
      regionParams: getRegionParams(),
      protectionLevel,
      establishedYear,
    };

    try {
      await executeFetchPipeline(ctx, !!cached, state, fetchedRef);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      handleFetchError(err, !!cached, state);
    } finally {
      setLoading(false);
    }
  }, [mpaId, hasValidGeometry, enabled, getRegionParams, protectionLevel, establishedYear]);

  useEffect(() => {
    if (enabled && hasValidGeometry && fetchedRef.current !== mpaId) {
      fetchData();
    }
  }, [enabled, hasValidGeometry, mpaId, fetchData]);

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

  return { data, loading, error, progress, refetch, isConfigured };
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
    if (getCachedData(mpa.id)) {
      console.log(`[prefetchFishingData] Skipping ${mpa.id} (already cached)`);
      continue;
    }

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

      const fishingData: FishingDataSummary = {
        fishingEffort: result,
        vesselActivity: [],
        compliance: mpa.protectionLevel
          ? calculateComplianceLocally(mpa.id, result, mpa.protectionLevel, mpa.establishedYear)
          : null,
        iuuRisk: calculateIUURiskLocally(mpa.id, result),
      };

      setCachedData(mpa.id, fishingData);
      console.log(`[prefetchFishingData] Cached data for ${mpa.id}`);

      if (mpas.indexOf(mpa) < mpas.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      console.warn(`[prefetchFishingData] Failed to prefetch ${mpa.id}:`, err);
    }
  }

  console.log('[prefetchFishingData] Pre-fetch complete');
}
