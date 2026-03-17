/**
 * useGamification Hook
 * Fetches gamification stats, badges, streaks, and species collection
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getGamificationStats,
  getUserSpeciesCollection,
  getLeaderboard,
} from '@/lib/gamification-service';
import type {
  GamificationStats,
  SpeciesCollectionEntry,
  LeaderboardEntry,
  LeaderboardType,
  LeaderboardPeriod,
} from '@/types/gamification';

interface UseGamificationResult {
  stats: GamificationStats | null;
  speciesCollection: SpeciesCollectionEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useGamification(userId: string | undefined): UseGamificationResult {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [speciesCollection, setSpeciesCollection] = useState<SpeciesCollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [gamStats, collection] = await Promise.all([
        getGamificationStats(userId),
        getUserSpeciesCollection(userId),
      ]);

      setStats(gamStats);
      setSpeciesCollection(collection);
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch gamification data'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    speciesCollection,
    loading,
    error,
    refetch: fetchData,
  };
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: Error | null;
}

export function useLeaderboard(
  type: LeaderboardType,
  period: LeaderboardPeriod,
  mpaId?: string
): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getLeaderboard(type, period, mpaId)
      .then(data => setEntries(data))
      .catch(err => {
        console.error('Failed to fetch leaderboard:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
      })
      .finally(() => setLoading(false));
  }, [type, period, mpaId]);

  return { entries, loading, error };
}
