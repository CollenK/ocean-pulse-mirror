import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedAdmin(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedAdmin(request);
  if ('error' in auth && auth.error instanceof NextResponse) return auth.error;
  const { supabase } = auth as { supabase: Awaited<ReturnType<typeof createClient>>; user: any };

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats': {
      const { data, error } = await (supabase as any)
        .from('admin_dashboard_stats')
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    case 'users': {
      // Get all profiles with their email from auth.users via a server-side query
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('id, display_name, avatar_url, is_expert, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      // Get observation counts per user
      const { data: obsCounts } = await (supabase as any)
        .from('observations')
        .select('user_id')
        .eq('is_draft', false);

      // Get verification counts per user
      const { data: verifCounts } = await (supabase as any)
        .from('observation_verifications')
        .select('user_id');

      // Count per user
      const obsCountMap: Record<string, number> = {};
      (obsCounts || []).forEach((o: any) => {
        obsCountMap[o.user_id] = (obsCountMap[o.user_id] || 0) + 1;
      });

      const verifCountMap: Record<string, number> = {};
      (verifCounts || []).forEach((v: any) => {
        verifCountMap[v.user_id] = (verifCountMap[v.user_id] || 0) + 1;
      });

      // Get emails from auth.users via admin API
      const { data: { users: authUsers } } = await (supabase as any).auth.admin.listUsers();

      const emailMap: Record<string, string> = {};
      (authUsers || []).forEach((u: any) => {
        emailMap[u.id] = u.email || '';
      });

      const users = (profiles || []).map((p: any) => ({
        id: p.id,
        email: emailMap[p.id] || 'Unknown',
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        is_expert: p.is_expert,
        is_admin: p.is_admin,
        created_at: p.created_at,
        observation_count: obsCountMap[p.id] || 0,
        verification_count: verifCountMap[p.id] || 0,
      }));

      return NextResponse.json(users);
    }

    case 'recent_observations': {
      const { data, error } = await (supabase as any)
        .from('observations')
        .select('id, species_name, report_type, quality_tier, photo_url, created_at, profiles (display_name, avatar_url)')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data || []);
    }

    case 'recent_verifications': {
      const { data, error } = await (supabase as any)
        .from('observation_verifications')
        .select('id, is_agreement, species_name, confidence, created_at, profiles:user_id (display_name), observations:observation_id (species_name)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data || []);
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedAdmin(request);
  if ('error' in auth && auth.error instanceof NextResponse) return auth.error;
  const { supabase } = auth as { supabase: Awaited<ReturnType<typeof createClient>>; user: any };

  const body = await request.json();

  if (body.action === 'toggle_role') {
    const { userId, role, value } = body;

    if (!['is_expert', 'is_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { error } = await (supabase as any)
      .from('profiles')
      .update({ [role]: value })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
