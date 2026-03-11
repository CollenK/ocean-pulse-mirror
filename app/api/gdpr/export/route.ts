/**
 * GDPR Data Export API
 *
 * Exports all user data as a downloadable JSON file.
 *
 * GET /api/gdpr/export
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Fetch all user data in parallel
    const [profileResult, savedMPAsResult, observationsResult, healthAssessmentsResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('saved_mpas')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('observations')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('user_health_assessments')
          .select('*')
          .eq('user_id', userId),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profileResult.data ?? null,
      observations: observationsResult.data ?? [],
      healthAssessments: healthAssessmentsResult.data ?? [],
      savedMPAs: savedMPAsResult.data ?? [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="ocean-pulse-data-export.json"',
      },
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
