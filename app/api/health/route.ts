import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};

  // Check Supabase connectivity
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const start = Date.now();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      checks.supabase = {
        status: res.ok ? 'ok' : 'error',
        latencyMs: Date.now() - start,
        ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
      };
    } catch (err) {
      checks.supabase = {
        status: 'error',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  } else {
    checks.supabase = { status: 'error', error: 'Not configured' };
  }

  // Check GFW API token configured
  checks.gfw = {
    status: process.env.GFW_API_TOKEN ? 'ok' : 'error',
    ...(!process.env.GFW_API_TOKEN ? { error: 'Not configured' } : {}),
  };

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
