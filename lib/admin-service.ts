import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

function getSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export interface AdminStats {
  total_users: number;
  expert_count: number;
  admin_count: number;
  total_observations: number;
  observations_last_7d: number;
  observations_last_30d: number;
  total_verifications: number;
  verifications_last_7d: number;
  total_mpas: number;
  total_saved_mpas: number;
  total_notifications: number;
  unread_notifications: number;
  tier_casual: number;
  tier_needs_id: number;
  tier_verified: number;
  tier_research_grade: number;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_expert: boolean;
  is_admin: boolean;
  created_at: string;
  observation_count: number;
  verification_count: number;
}

export interface RecentObservation {
  id: string;
  species_name: string | null;
  report_type: string;
  quality_tier: string;
  photo_url: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface RecentVerification {
  id: string;
  is_agreement: boolean;
  species_name: string | null;
  confidence: number;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
  observations: {
    species_name: string | null;
  } | null;
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await (supabase.from('profiles') as any)
    .select('is_admin')
    .eq('id', userId)
    .single();
  return data?.is_admin === true;
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  const response = await fetch('/api/admin?action=stats');
  if (!response.ok) return null;
  return response.json();
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch('/api/admin?action=users');
  if (!response.ok) return [];
  return response.json();
}

export async function fetchRecentObservations(): Promise<RecentObservation[]> {
  const response = await fetch('/api/admin?action=recent_observations');
  if (!response.ok) return [];
  return response.json();
}

export async function fetchRecentVerifications(): Promise<RecentVerification[]> {
  const response = await fetch('/api/admin?action=recent_verifications');
  if (!response.ok) return [];
  return response.json();
}

export async function toggleUserRole(
  userId: string,
  role: 'is_expert' | 'is_admin',
  value: boolean
): Promise<boolean> {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'toggle_role', userId, role, value }),
  });
  return response.ok;
}
