'use client';

import { BADGE_DEFINITIONS, type UserBadge } from '@/types/gamification';
import { AchievementBadge } from './AchievementBadge';

interface BadgesGridProps {
  earnedBadges: UserBadge[];
}

export function BadgesGrid({ earnedBadges }: BadgesGridProps) {
  const earnedMap = new Map(earnedBadges.map(b => [b.badge_id, b.earned_at]));
  const earnedCount = earnedBadges.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-balean-gray-500">
          {earnedCount}/{BADGE_DEFINITIONS.length} Badges Earned
        </p>
        <div className="h-2 w-24 bg-balean-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${(earnedCount / BADGE_DEFINITIONS.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BADGE_DEFINITIONS.map(badge => (
          <AchievementBadge
            key={badge.id}
            badge={badge}
            earned={earnedMap.has(badge.id)}
            earnedAt={earnedMap.get(badge.id)}
          />
        ))}
      </div>
    </div>
  );
}
