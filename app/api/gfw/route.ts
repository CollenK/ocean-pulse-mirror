/**
 * Global Fishing Watch API Route
 *
 * Proxies requests to the GFW API with server-side authentication.
 * This keeps the API token secure on the server.
 *
 * Endpoints:
 * - GET /api/gfw?action=fishing-effort&mpaId=...&geometry=...
 * - GET /api/gfw?action=vessel-activity&mpaId=...&geometry=...&days=...
 * - GET /api/gfw?action=compliance&mpaId=...&geometry=...&protectionLevel=...
 * - GET /api/gfw?action=iuu-risk&mpaId=...&geometry=...
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getFishingEffortForMPA,
  getVesselActivityForMPA,
  calculateComplianceScore,
  getIUURiskForMPA,
  geometryToGFWRegion,
  boundsToGFWRegion,
} from '@/lib/gfw-client';
import { captureError } from '@/lib/error-reporting';
import { rateLimit, getRequestIp } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import type { GFWRegion } from '@/types/gfw';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for GFW API calls

const checkRateLimit = rateLimit({ interval: 60_000, limit: 30 });

function parseGeometry(geometryStr?: string, boundsStr?: string): GFWRegion | null {
  if (geometryStr) {
    try {
      const parsed = JSON.parse(geometryStr);
      return geometryToGFWRegion(parsed);
    } catch {
      console.error('[GFW API Route] Failed to parse geometry');
      return null;
    }
  }

  if (boundsStr) {
    try {
      const parsed = JSON.parse(boundsStr);
      return boundsToGFWRegion(parsed);
    } catch {
      console.error('[GFW API Route] Failed to parse bounds');
      return null;
    }
  }

  return null;
}

// ============================================================================
// Action Handlers
// ============================================================================

function handleFishingEffort(mpaId: string, region: GFWRegion) {
  return getFishingEffortForMPA(mpaId, region);
}

function handleVesselActivity(mpaId: string, region: GFWRegion, daysStr?: string) {
  const days = daysStr ? parseInt(daysStr) : 30;
  return getVesselActivityForMPA(mpaId, region, days);
}

function handleCompliance(
  mpaId: string,
  region: GFWRegion,
  protectionLevel?: string,
  establishedYearStr?: string
): NextResponse | Promise<unknown> {
  if (!protectionLevel) {
    return NextResponse.json(
      { error: 'Missing required parameter: protectionLevel' },
      { status: 400 }
    );
  }
  const establishedYear = establishedYearStr
    ? parseInt(establishedYearStr)
    : undefined;
  return calculateComplianceScore(mpaId, region, protectionLevel, establishedYear);
}

function handleIUURisk(mpaId: string, region: GFWRegion, daysStr?: string) {
  const days = daysStr ? parseInt(daysStr) : 90;
  return getIUURiskForMPA(mpaId, region, days);
}

async function handleHealthCheck(): Promise<NextResponse> {
  const token = process.env.GFW_API_TOKEN;
  const hasToken = !!token;

  let apiReachable = false;
  let apiError = null;

  if (hasToken) {
    try {
      const testUrl = 'https://gateway.api.globalfishingwatch.org/v3/vessels/search?query=test&datasets%5B0%5D=public-global-vessel-identity:latest&limit=1';
      const testResponse = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      apiReachable = testResponse.ok;
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        apiError = `${testResponse.status}: ${errorText.substring(0, 200)}`;
      }
    } catch (err) {
      apiError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  return NextResponse.json({
    success: true,
    data: { configured: hasToken, apiReachable, apiError, timestamp: Date.now() },
  });
}

// ============================================================================
// Error Response Mapping
// ============================================================================

const ERROR_MATCHERS: Array<{ test: (msg: string) => boolean; error: string; status: number }> = [
  {
    test: (msg) => msg.includes('GFW_API_TOKEN') || msg.includes('not set'),
    error: 'GFW API not configured. Please set GFW_API_TOKEN environment variable.',
    status: 503,
  },
  {
    test: (msg) => msg.includes('429') || msg.includes('rate limit'),
    error: 'Rate limited by GFW API. Please try again later.',
    status: 429,
  },
  {
    test: (msg) => msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized'),
    error: 'GFW API authentication failed. Your API token may be invalid or expired.',
    status: 401,
  },
  {
    test: (msg) => msg.includes('404'),
    error: 'GFW API endpoint not found. The API may have changed.',
    status: 404,
  },
  {
    test: (msg) => msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('Connection loss'),
    error: 'Global Fishing Watch service is temporarily unavailable. Please try again later.',
    status: 503,
  },
];

function mapErrorToResponse(error: unknown, context: Record<string, string>): NextResponse {
  captureError(error, context);

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  for (const matcher of ERROR_MATCHERS) {
    if (matcher.test(errorMessage)) {
      return NextResponse.json(
        { error: matcher.error, details: errorMessage },
        { status: matcher.status }
      );
    }
  }

  return NextResponse.json(
    { error: 'Failed to fetch GFW data', details: errorMessage },
    { status: 500 }
  );
}

// ============================================================================
// Shared Auth + Rate Limit Check
// ============================================================================

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const ip = getRequestIp(request);
  const rateLimitResult = checkRateLimit(ip);
  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return null;
}

// ============================================================================
// Action Dispatcher
// ============================================================================

async function dispatchAction(
  action: string,
  mpaId: string,
  region: GFWRegion | null,
  params: { days?: string; protectionLevel?: string; establishedYear?: string }
): Promise<NextResponse> {
  if (!region && action !== 'health-check') {
    return NextResponse.json(
      { error: 'Missing or invalid geometry/bounds parameter' },
      { status: 400 }
    );
  }

  if (action === 'health-check') {
    return handleHealthCheck();
  }

  switch (action) {
    case 'fishing-effort': {
      const data = await handleFishingEffort(mpaId, region!);
      return NextResponse.json({ success: true, data });
    }
    case 'vessel-activity': {
      const data = await handleVesselActivity(mpaId, region!, params.days);
      return NextResponse.json({ success: true, data });
    }
    case 'compliance': {
      const result = handleCompliance(mpaId, region!, params.protectionLevel, params.establishedYear);
      if (result instanceof NextResponse) return result;
      const data = await result;
      return NextResponse.json({ success: true, data });
    }
    case 'iuu-risk': {
      const data = await handleIUURisk(mpaId, region!, params.days);
      return NextResponse.json({ success: true, data });
    }
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;

  const action = searchParams.get('action') || '';
  const mpaId = searchParams.get('mpaId') || '';

  if (!action) {
    return NextResponse.json({ error: 'Missing required parameter: action' }, { status: 400 });
  }
  if (!mpaId) {
    return NextResponse.json({ error: 'Missing required parameter: mpaId' }, { status: 400 });
  }

  const region = parseGeometry(
    searchParams.get('geometry') || undefined,
    searchParams.get('bounds') || undefined
  );

  try {
    return await dispatchAction(action, mpaId, region, {
      days: searchParams.get('days') || undefined,
      protectionLevel: searchParams.get('protectionLevel') || undefined,
      establishedYear: searchParams.get('establishedYear') || undefined,
    });
  } catch (error) {
    return mapErrorToResponse(error, { context: 'GFW API GET', action, mpaId });
  }
}

// Support POST for larger geometry payloads
export async function POST(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, mpaId, geometry, bounds, days, protectionLevel, establishedYear } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing required parameter: action' }, { status: 400 });
    }
    if (!mpaId) {
      return NextResponse.json({ error: 'Missing required parameter: mpaId' }, { status: 400 });
    }

    let gfwGeometry: GFWRegion | null = null;
    try {
      if (geometry) {
        gfwGeometry = geometryToGFWRegion(geometry);
      } else if (bounds) {
        gfwGeometry = boundsToGFWRegion(bounds);
      }
    } catch (geoError) {
      console.error('[GFW API Route] Geometry conversion error:', geoError);
      return NextResponse.json(
        { error: 'Invalid geometry format', details: geoError instanceof Error ? geoError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    return await dispatchAction(action, mpaId, gfwGeometry, {
      days: days != null ? String(days) : undefined,
      protectionLevel,
      establishedYear: establishedYear != null ? String(establishedYear) : undefined,
    });
  } catch (error) {
    return mapErrorToResponse(error, { context: 'GFW API POST' });
  }
}
