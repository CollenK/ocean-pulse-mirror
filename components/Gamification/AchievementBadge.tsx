'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '@/components/ui';
import type { BadgeDefinition } from '@/types/gamification';

interface AchievementBadgeProps {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
}

const categoryColors: Record<string, { bg: string; icon: string; ring: string }> = {
  observation: { bg: 'bg-blue-50', icon: 'text-blue-500', ring: 'ring-blue-200' },
  verification: { bg: 'bg-cyan-50', icon: 'text-cyan-500', ring: 'ring-cyan-200' },
  streak: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-200' },
  collection: { bg: 'bg-emerald-50', icon: 'text-emerald-500', ring: 'ring-emerald-200' },
};

export function AchievementBadge({ badge, earned, earnedAt }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = categoryColors[badge.category] || categoryColors.observation;

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all w-full ${
          earned
            ? `${colors.bg} ring-1 ${colors.ring}`
            : 'bg-balean-gray-50 opacity-40 grayscale'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(prev => !prev)}
        aria-label={`${badge.name}: ${badge.description}`}
      >
        {earned ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Icon name={badge.icon} size="xl" className={colors.icon} />
          </motion.div>
        ) : (
          <Icon name={badge.icon} size="xl" className="text-balean-gray-300" />
        )}
        <span className={`text-xs font-medium text-center leading-tight ${
          earned ? 'text-balean-navy' : 'text-balean-gray-400'
        }`}>
          {badge.name}
        </span>
      </motion.button>

      {showTooltip && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-balean-navy text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
          <p className="font-medium">{badge.name}</p>
          <p className="opacity-80">{badge.description}</p>
          {earned && earnedAt && (
            <p className="opacity-60 mt-0.5">
              Earned {new Date(earnedAt).toLocaleDateString()}
            </p>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-balean-navy rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}
