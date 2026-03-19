import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEMO_USER_ID } from '@/lib/demo/demo-config';
import { DEMO_OBSERVATIONS, DEMO_HEALTH_ASSESSMENTS } from '@/lib/demo/demo-seed-data';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

function errorResponse(message: string, details?: unknown, status = 500) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

async function clearDemoData(supabase: SupabaseClient) {
  const { error: delObsErr } = await supabase
    .from('observations')
    .delete()
    .eq('user_id', DEMO_USER_ID);

  const { error: delAssessErr } = await supabase
    .from('user_health_assessments')
    .delete()
    .eq('user_id', DEMO_USER_ID);

  if (delObsErr || delAssessErr) {
    return errorResponse('Failed to clear demo data', {
      observations: delObsErr?.message,
      assessments: delAssessErr?.message,
    });
  }
  return null;
}

async function resolveValidMPAs(supabase: SupabaseClient) {
  const externalIds = [
    ...new Set([
      ...DEMO_OBSERVATIONS.map((o) => o.mpaExternalId),
      ...DEMO_HEALTH_ASSESSMENTS.map((a) => a.mpaExternalId),
    ]),
  ];

  const { data: mpas, error: mpaErr } = await supabase
    .from('mpas')
    .select('external_id')
    .in('external_id', externalIds);

  if (mpaErr) {
    return { ids: null, total: externalIds.length, error: errorResponse('Failed to look up MPAs', mpaErr.message) };
  }

  const ids = new Set<string>(
    (mpas ?? []).map((m) => m.external_id).filter(Boolean) as string[]
  );
  return { ids, total: externalIds.length, error: null };
}

function buildObservationRows(validIds: Set<string>, now: Date) {
  return DEMO_OBSERVATIONS
    .filter((o) => validIds.has(o.mpaExternalId))
    .map((o) => {
      const observedAt = new Date(now.getTime() - o.daysAgo * 86400000);
      return {
        user_id: DEMO_USER_ID, mpa_id: o.mpaExternalId, report_type: o.reportType,
        species_name: o.speciesName ?? null, quantity: o.quantity ?? null,
        notes: o.notes, latitude: o.latitude, longitude: o.longitude,
        location_accuracy_m: 10, location_manually_entered: false,
        health_score_assessment: o.healthScoreAssessment ?? null,
        is_draft: false, quality_tier: o.qualityTier,
        observed_at: observedAt.toISOString(), synced_at: now.toISOString(),
        litter_items: o.litterItems ?? null, litter_weight_kg: o.litterWeightKg ?? null,
        survey_length_m: o.surveyLengthM ?? null,
      };
    });
}

async function insertRows(supabase: SupabaseClient, table: string, rows: Record<string, unknown>[], errorMsg: string) {
  if (rows.length === 0) return { count: 0, error: null };
  const { data, error } = await supabase.from(table).insert(rows).select('id');
  if (error) return { count: 0, error: errorResponse(errorMsg, error.message) };
  return { count: data?.length ?? 0, error: null };
}

function buildAssessmentRows(validIds: Set<string>, now: Date) {
  return DEMO_HEALTH_ASSESSMENTS
    .filter((a) => validIds.has(a.mpaExternalId))
    .map((a) => ({
      user_id: DEMO_USER_ID, mpa_id: a.mpaExternalId, score: a.score,
      assessed_at: new Date(now.getTime() - a.daysAgo * 86400000).toISOString(),
    }));
}

/**
 * POST /api/demo/seed
 *
 * Restores demo account observations and health assessments.
 * Protected by CRON_SECRET. Uses service role key to bypass RLS.
 * Idempotent: deletes existing demo data before re-inserting.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return errorResponse('Unauthorized', undefined, 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return errorResponse('Missing Supabase config');
  if (!DEMO_USER_ID) return errorResponse('DEMO_USER_ID not configured');

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  const clearErr = await clearDemoData(supabase);
  if (clearErr) return clearErr;

  const { ids: validExternalIds, total: mpasTotal, error: mpaErr } = await resolveValidMPAs(supabase);
  if (mpaErr || !validExternalIds) return mpaErr!;

  const obsResult = await insertRows(supabase, 'observations', buildObservationRows(validExternalIds, now), 'Failed to insert observations');
  if (obsResult.error) return obsResult.error;

  const assessResult = await insertRows(supabase, 'user_health_assessments', buildAssessmentRows(validExternalIds, now), 'Failed to insert assessments');
  if (assessResult.error) return assessResult.error;

  await supabase.from('profiles').upsert({
    id: DEMO_USER_ID, display_name: 'Demo Explorer',
  }, { onConflict: 'id' });

  return NextResponse.json({
    success: true, mpasFound: validExternalIds.size, mpasTotal,
    observations: obsResult.count, healthAssessments: assessResult.count,
  });
}
