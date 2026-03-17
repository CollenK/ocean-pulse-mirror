/**
 * Gamification Service
 * Handles badge queries, streak data, species collection, and leaderboard fetching
 */

import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { captureError } from '@/lib/error-reporting';
import type {
  UserBadge,
  UserStreak,
  SpeciesCollectionEntry,
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardPeriod,
  GamificationStats,
} from '@/types/gamification';

/**
 * Fetch all badges earned by a user
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('user_badges') as any)
    .select('*')
    .eq('user_id', userId)
    .order('earned_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch user badges:', error);
    return [];
  }

  return (data || []) as UserBadge[];
}

/**
 * Fetch the streak data for a user
 */
export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('user_streaks') as any)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user streak:', error);
    return null;
  }

  return data as UserStreak | null;
}

/**
 * Fetch the species collection (life list) for a user
 */
export async function getUserSpeciesCollection(userId: string): Promise<SpeciesCollectionEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('user_species_collection') as any)
    .select('*')
    .eq('user_id', userId)
    .order('first_seen_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch species collection:', error);
    return [];
  }

  return (data || []) as SpeciesCollectionEntry[];
}

/**
 * Fetch the leaderboard via RPC
 */
export async function getLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  mpaId?: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_leaderboard', {
    p_type: type,
    p_period: period,
    p_mpa_id: mpaId || null,
    p_limit: limit,
  });

  if (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }

  return (data || []) as LeaderboardEntry[];
}

/**
 * Aggregate gamification stats for a user (badges + streak + counts)
 */
export async function getGamificationStats(userId: string): Promise<GamificationStats> {
  if (!isSupabaseConfigured()) {
    return {
      badges: [],
      streak: { user_id: userId, current_streak: 0, longest_streak: 0, last_observation_date: '' },
      speciesCount: 0,
      totalObservations: 0,
    };
  }

  const [badges, streak, collection] = await Promise.all([
    getUserBadges(userId),
    getUserStreak(userId),
    getUserSpeciesCollection(userId),
  ]);

  const supabase = createClient();

  // Get total observation count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase
    .from('observations') as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_draft', false);

  if (error) {
    console.error('Failed to fetch observation count:', error);
  }

  return {
    badges,
    streak: streak || { user_id: userId, current_streak: 0, longest_streak: 0, last_observation_date: '' },
    speciesCount: collection.length,
    totalObservations: count ?? 0,
  };
}

/**
 * Manually trigger badge check (e.g. after syncing offline observations)
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('check_and_award_badges', {
    p_user_id: userId,
  });

  if (error) {
    captureError(error, { context: 'checkAndAwardBadges', userId });
    throw error;
  }

  return (data || []) as string[];
}
