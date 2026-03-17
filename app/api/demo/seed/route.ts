import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEMO_USER_ID } from '@/lib/demo/demo-config';
import { DEMO_OBSERVATIONS, DEMO_HEALTH_ASSESSMENTS } from '@/lib/demo/demo-seed-data';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
  }

  if (!DEMO_USER_ID) {
    return NextResponse.json({ error: 'DEMO_USER_ID not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = new Date();

  // 1. Delete existing demo data
  const { error: delObsErr } = await supabase
    .from('observations')
    .delete()
    .eq('user_id', DEMO_USER_ID);

  const { error: delAssessErr } = await supabase
    .from('user_health_assessments')
    .delete()
    .eq('user_id', DEMO_USER_ID);

  if (delObsErr || delAssessErr) {
    return NextResponse.json({
      error: 'Failed to clear demo data',
      details: { observations: delObsErr?.message, assessments: delAssessErr?.message },
    }, { status: 500 });
  }

  // 2. Verify which MPAs exist in the database
  // Note: observations.mpa_id stores the external_id (WDPA ID), not the internal UUID
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
    return NextResponse.json({ error: 'Failed to look up MPAs', details: mpaErr.message }, { status: 500 });
  }

  const validExternalIds = new Set<string>(
    (mpas ?? []).map((m) => m.external_id).filter(Boolean) as string[]
  );

  // 3. Insert observations (skip those whose MPA was not found)
  const obsRows = DEMO_OBSERVATIONS
    .filter((o) => validExternalIds.has(o.mpaExternalId))
    .map((o) => {
      const observedAt = new Date(now.getTime() - o.daysAgo * 86400000);
      return {
        user_id: DEMO_USER_ID,
        mpa_id: o.mpaExternalId,
        report_type: o.reportType,
        species_name: o.speciesName ?? null,
        quantity: o.quantity ?? null,
        notes: o.notes,
        latitude: o.latitude,
        longitude: o.longitude,
        location_accuracy_m: 10,
        location_manually_entered: false,
        health_score_assessment: o.healthScoreAssessment ?? null,
        is_draft: false,
        quality_tier: o.qualityTier,
        observed_at: observedAt.toISOString(),
        synced_at: now.toISOString(),
        litter_items: o.litterItems ?? null,
        litter_weight_kg: o.litterWeightKg ?? null,
        survey_length_m: o.surveyLengthM ?? null,
      };
    });

  let insertedObs = 0;
  if (obsRows.length > 0) {
    const { data, error } = await supabase.from('observations').insert(obsRows).select('id');
    if (error) {
      return NextResponse.json({ error: 'Failed to insert observations', details: error.message }, { status: 500 });
    }
    insertedObs = data?.length ?? 0;
  }

  // 4. Insert health assessments
  const assessRows = DEMO_HEALTH_ASSESSMENTS
    .filter((a) => validExternalIds.has(a.mpaExternalId))
    .map((a) => {
      const assessedAt = new Date(now.getTime() - a.daysAgo * 86400000);
      return {
        user_id: DEMO_USER_ID,
        mpa_id: a.mpaExternalId,
        score: a.score,
        assessed_at: assessedAt.toISOString(),
      };
    });

  let insertedAssess = 0;
  if (assessRows.length > 0) {
    const { data, error } = await supabase.from('user_health_assessments').insert(assessRows).select('id');
    if (error) {
      return NextResponse.json({ error: 'Failed to insert assessments', details: error.message }, { status: 500 });
    }
    insertedAssess = data?.length ?? 0;
  }

  // 5. Upsert demo profile
  await supabase.from('profiles').upsert({
    id: DEMO_USER_ID,
    display_name: 'Demo Explorer',
  }, { onConflict: 'id' });

  return NextResponse.json({
    success: true,
    mpasFound: validExternalIds.size,
    mpasTotal: externalIds.length,
    observations: insertedObs,
    healthAssessments: insertedAssess,
  });
}
