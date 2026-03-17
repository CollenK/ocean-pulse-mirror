'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/ui';
import type { UserStreak } from '@/types/gamification';

interface StreakCounterProps {
  streak: UserStreak;
}

export function StreakCounter({ streak }: StreakCounterProps) {
  const isActive = streak.current_streak > 0 && streak.last_observation_date === new Date().toISOString().split('T')[0];

  return (
    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
      <motion.div
        animate={streak.current_streak > 0 ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="flex-shrink-0"
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          streak.current_streak > 0 ? 'bg-amber-100' : 'bg-balean-gray-100'
        }`}>
          <Icon
            name="flame"
            size="lg"
            className={streak.current_streak > 0 ? 'text-amber-500' : 'text-balean-gray-300'}
          />
        </div>
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={streak.current_streak}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold text-amber-600"
          >
            {streak.current_streak}
          </motion.span>
          <span className="text-sm text-balean-gray-500">
            day{streak.current_streak !== 1 ? 's' : ''} streak
          </span>
          {isActive && (
            <span className="text-xs font-medium text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-balean-gray-400 mt-0.5">
          Longest: {streak.longest_streak} day{streak.longest_streak !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
