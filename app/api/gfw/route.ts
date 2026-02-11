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
import type { GFWRegion } from '@/types/gfw';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for GFW API calls

interface RequestParams {
  action: string;
  mpaId: string;
  geometry?: string;
  bounds?: string;
  days?: string;
  protectionLevel?: string;
  establishedYear?: string;
}

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: RequestParams = {
    action: searchParams.get('action') || '',
    mpaId: searchParams.get('mpaId') || '',
    geometry: searchParams.get('geometry') || undefined,
    bounds: searchParams.get('bounds') || undefined,
    days: searchParams.get('days') || undefined,
    protectionLevel: searchParams.get('protectionLevel') || undefined,
    establishedYear: searchParams.get('establishedYear') || undefined,
  };

  // Validate required params
  if (!params.action) {
    return NextResponse.json(
      { error: 'Missing required parameter: action' },
      { status: 400 }
    );
  }

  if (!params.mpaId) {
    return NextResponse.json(
      { error: 'Missing required parameter: mpaId' },
      { status: 400 }
    );
  }

  // Parse geometry
  const geometry = parseGeometry(params.geometry, params.bounds);
  if (!geometry && params.action !== 'health-check') {
    return NextResponse.json(
      { error: 'Missing or invalid geometry/bounds parameter' },
      { status: 400 }
    );
  }

  try {
    switch (params.action) {
      case 'fishing-effort': {
        const data = await getFishingEffortForMPA(params.mpaId, geometry!);
        return NextResponse.json({ success: true, data });
      }

      case 'vessel-activity': {
        const days = params.days ? parseInt(params.days) : 30;
        const data = await getVesselActivityForMPA(params.mpaId, geometry!, days);
        return NextResponse.json({ success: true, data });
      }

      case 'compliance': {
        if (!params.protectionLevel) {
          return NextResponse.json(
            { error: 'Missing required parameter: protectionLevel' },
            { status: 400 }
          );
        }
        const establishedYear = params.establishedYear
          ? parseInt(params.establishedYear)
          : undefined;
        const data = await calculateComplianceScore(
          params.mpaId,
          geometry!,
          params.protectionLevel,
          establishedYear
        );
        return NextResponse.json({ success: true, data });
      }

      case 'iuu-risk': {
        const days = params.days ? parseInt(params.days) : 90;
        const data = await getIUURiskForMPA(params.mpaId, geometry!, days);
        return NextResponse.json({ success: true, data });
      }

      case 'health-check': {
        // Simple health check to verify API token is configured
        const token = process.env.GFW_API_TOKEN;
        const hasToken = !!token;
        const tokenPreview = hasToken ? `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : null;

        console.log('[GFW API Route] Health check:', { hasToken, tokenPreview });

        // Try to reach GFW API with proper dataset parameter
        let apiReachable = false;
        let apiError = null;
        if (hasToken) {
          try {
            const testResponse = await fetch('https://gateway.api.globalfishingwatch.org/v3/vessels/search?query=test&datasets%5B0%5D=public-global-vessel-identity:latest&limit=1', {
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
          data: {
            configured: hasToken,
            tokenPreview, // First/last few chars for debugging
            apiReachable,
            apiError,
            timestamp: Date.now(),
          },
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${params.action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`[GFW API Route] Error handling ${params.action}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log full details for debugging
    console.error('[GFW API Route] Full error details:', {
      action: params.action,
      mpaId: params.mpaId,
      hasGeometry: !!params.geometry,
      hasBounds: !!params.bounds,
      errorMessage,
      errorStack,
    });

    // Check for specific error types
    if (errorMessage.includes('GFW_API_TOKEN') || errorMessage.includes('not set')) {
      return NextResponse.json(
        { error: 'GFW API not configured. Please set GFW_API_TOKEN environment variable.', details: errorMessage },
        { status: 503 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limited by GFW API. Please try again later.', details: errorMessage },
        { status: 429 }
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return NextResponse.json(
        { error: 'GFW API authentication failed. Your API token may be invalid or expired.', details: errorMessage },
        { status: 401 }
      );
    }

    if (errorMessage.includes('404')) {
      return NextResponse.json(
        { error: 'GFW API endpoint not found. The API may have changed.', details: errorMessage },
        { status: 404 }
      );
    }

    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('Connection loss')) {
      return NextResponse.json(
        { error: 'Global Fishing Watch service is temporarily unavailable. Please try again later.', details: errorMessage },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch GFW data', details: errorMessage },
      { status: 500 }
    );
  }
}

// Support POST for larger geometry payloads
export async function POST(request: NextRequest) {
  console.log('[GFW API Route] POST request received');

  try {
    const body = await request.json();
    console.log('[GFW API Route] POST body:', {
      action: body.action,
      mpaId: body.mpaId,
      hasGeometry: !!body.geometry,
      hasBounds: !!body.bounds,
      geometryType: body.geometry?.type,
    });

    const { action, mpaId, geometry, bounds, days, protectionLevel, establishedYear } = body;

    // Validate required params
    if (!action) {
      return NextResponse.json(
        { error: 'Missing required parameter: action' },
        { status: 400 }
      );
    }

    if (!mpaId) {
      return NextResponse.json(
        { error: 'Missing required parameter: mpaId' },
        { status: 400 }
      );
    }

    // Parse geometry
    let gfwGeometry = null;
    try {
      if (geometry) {
        console.log('[GFW API Route] Converting geometry:', geometry.type);
        gfwGeometry = geometryToGFWRegion(geometry);
      } else if (bounds) {
        console.log('[GFW API Route] Converting bounds:', bounds.length, 'points');
        gfwGeometry = boundsToGFWRegion(bounds);
      }
    } catch (geoError) {
      console.error('[GFW API Route] Geometry conversion error:', geoError);
      return NextResponse.json(
        { error: 'Invalid geometry format', details: geoError instanceof Error ? geoError.message : 'Unknown error' },
        { status: 400 }
      );
    }

    if (!gfwGeometry) {
      return NextResponse.json(
        { error: 'Missing or invalid geometry/bounds parameter' },
        { status: 400 }
      );
    }

    console.log('[GFW API Route] GFW geometry ready:', gfwGeometry.type);

    switch (action) {
      case 'fishing-effort': {
        const data = await getFishingEffortForMPA(mpaId, gfwGeometry);
        return NextResponse.json({ success: true, data });
      }

      case 'vessel-activity': {
        const data = await getVesselActivityForMPA(mpaId, gfwGeometry, days || 30);
        return NextResponse.json({ success: true, data });
      }

      case 'compliance': {
        if (!protectionLevel) {
          return NextResponse.json(
            { error: 'Missing required parameter: protectionLevel' },
            { status: 400 }
          );
        }
        const data = await calculateComplianceScore(
          mpaId,
          gfwGeometry,
          protectionLevel,
          establishedYear
        );
        return NextResponse.json({ success: true, data });
      }

      case 'iuu-risk': {
        const data = await getIUURiskForMPA(mpaId, gfwGeometry, days || 90);
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[GFW API Route] POST error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('[GFW API Route] POST full error:', {
      errorMessage,
      errorStack,
    });

    // Check for specific error types
    if (errorMessage.includes('GFW_API_TOKEN') || errorMessage.includes('not set')) {
      return NextResponse.json(
        { error: 'GFW API not configured. Please set GFW_API_TOKEN environment variable.', details: errorMessage },
        { status: 503 }
      );
    }

    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'GFW API authentication failed. Your API token may be invalid or expired.', details: errorMessage },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch GFW data', details: errorMessage },
      { status: 500 }
    );
  }
}
