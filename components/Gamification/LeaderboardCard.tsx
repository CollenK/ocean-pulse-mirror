'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui';
import { useLeaderboard } from '@/hooks/useGamification';
import type { LeaderboardType, LeaderboardPeriod } from '@/types/gamification';

interface LeaderboardCardProps {
  currentUserId?: string;
  mpaId?: string;
}

const TYPE_TABS: { value: LeaderboardType; label: string }[] = [
  { value: 'observations', label: 'Observations' },
  { value: 'species', label: 'Species' },
  { value: 'verifications', label: 'Verifications' },
];

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
];

export function LeaderboardCard({ currentUserId, mpaId }: LeaderboardCardProps) {
  const [type, setType] = useState<LeaderboardType>('observations');
  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly');
  const { entries, loading } = useLeaderboard(type, period, mpaId);

  const topEntries = entries.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Type tabs */}
      <div className="flex gap-1 bg-balean-gray-100 rounded-lg p-1">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setType(tab.value)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
              type === tab.value
                ? 'bg-white text-balean-navy shadow-sm'
                : 'text-balean-gray-400 hover:text-balean-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Period toggle */}
      <div className="flex gap-1 justify-center">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={`text-xs px-3 py-1 rounded-full transition-all ${
              period === opt.value
                ? 'bg-purple-100 text-purple-700 font-medium'
                : 'text-balean-gray-400 hover:text-balean-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent" />
        </div>
      ) : topEntries.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-balean-gray-400">No entries yet this period</p>
        </div>
      ) : (
        <div className="space-y-1">
          {topEntries.map(entry => {
            const isCurrentUser = currentUserId === entry.user_id;
            const rankColors: Record<number, string> = {
              1: 'text-amber-500',
              2: 'text-balean-gray-400',
              3: 'text-amber-700',
            };

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-purple-50 ring-1 ring-purple-200' : 'hover:bg-balean-gray-50'
                }`}
              >
                <span className={`w-6 text-center text-sm font-bold ${
                  rankColors[entry.rank] || 'text-balean-gray-300'
                }`}>
                  {entry.rank}
                </span>
                {entry.avatar_url ? (
                  <img
                    src={entry.avatar_url}
                    alt={entry.display_name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-balean-gray-200 flex items-center justify-center">
                    <Icon name="user" size="sm" className="text-balean-gray-400" />
                  </div>
                )}
                <span className={`flex-1 text-sm truncate ${
                  isCurrentUser ? 'font-semibold text-purple-700' : 'text-balean-navy'
                }`}>
                  {entry.display_name}
                  {isCurrentUser && <span className="text-xs ml-1 opacity-60">(you)</span>}
                </span>
                <span className="text-sm font-semibold text-balean-gray-500">
                  {entry.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
