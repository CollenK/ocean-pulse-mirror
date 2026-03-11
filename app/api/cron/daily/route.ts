import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runPipeline } from '@/lib/pipeline-service';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Combined daily cron job:
 * 1. Cleans up old draft observations (90+ days)
 * 2. Runs the OBIS data pipeline for a batch of MPAs
 *
 * Runs once daily at 3 AM UTC via Vercel Cron (Hobby plan).
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // 1. Draft cleanup
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data, error } = await supabase.rpc('cleanup_old_drafts', { p_days_old: 90 });

      results.cleanup = error
        ? { error: error.message }
        : { deletedDrafts: data };
    } catch (error) {
      results.cleanup = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // 2. OBIS data pipeline (process a batch of stale MPAs)
  try {
    const pipelineResult = await runPipeline(3);
    results.pipeline = pipelineResult;
  } catch (error) {
    results.pipeline = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  return NextResponse.json(results);
}
