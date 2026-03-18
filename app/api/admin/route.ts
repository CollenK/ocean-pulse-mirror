import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface AuthSuccess {
  supabase: SupabaseClient;
  user: User;
}

interface AuthError {
  error: NextResponse;
}

async function getAuthenticatedAdmin(_request: NextRequest): Promise<AuthSuccess | AuthError> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
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
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats': {
      const { data, error } = await supabase
        .from('admin_dashboard_stats' as 'profiles')
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    case 'users': {
      // Get all profiles with their email from auth.users via a server-side query
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_expert, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }

      // Get observation counts per user
      const { data: obsCounts } = await supabase
        .from('observations')
        .select('user_id')
        .eq('is_draft', false);

      // Get verification counts per user
      const { data: verifCounts } = await supabase
        .from('observation_verifications')
        .select('user_id');

      // Count per user
      const obsCountMap: Record<string, number> = {};
      (obsCounts || []).forEach((o) => {
        const userId = o.user_id;
        if (userId) {
          obsCountMap[userId] = (obsCountMap[userId] || 0) + 1;
        }
      });

      const verifCountMap: Record<string, number> = {};
      (verifCounts || []).forEach((v) => {
        verifCountMap[v.user_id] = (verifCountMap[v.user_id] || 0) + 1;
      });

      // Get emails from auth.users via admin API
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

      const emailMap: Record<string, string> = {};
      (authUsers || []).forEach((u) => {
        emailMap[u.id] = u.email || '';
      });

      const users = (profiles || []).map((p) => ({
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
  if ('error' in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json();

  if (body.action === 'toggle_role') {
    const { userId, role, value } = body;

    if (!['is_expert', 'is_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { error } = await supabase
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
