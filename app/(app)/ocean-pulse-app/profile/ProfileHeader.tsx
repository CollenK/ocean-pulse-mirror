'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui';
import { getBadgeDefinition } from '@/types/gamification';
import type { GamificationStats } from '@/types/gamification';

interface ProfileHeaderProps {
  avatarUrl: string | null | undefined;
  displayName: string;
  email: string | undefined;
  gamStats: GamificationStats | null;
}

export function ProfileHeader({ avatarUrl, displayName, email, gamStats }: ProfileHeaderProps) {
  return (
    <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-4 pb-16 px-6">
      <div className="max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
              <span className="text-white text-3xl font-medium">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">{displayName}</h1>
            <p className="text-white/80">{email}</p>
            <Badge variant="info" size="sm" className="mt-2 bg-white/20 text-white border-none">
              {gamStats && gamStats.badges.length > 0
                ? getBadgeDefinition(gamStats.badges[gamStats.badges.length - 1].badge_id)?.name || 'Marine Observer'
                : 'Marine Observer'}
            </Badge>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
