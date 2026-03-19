'use client';

import { motion } from 'framer-motion';
import { Card, CardTitle, CardContent, Icon } from '@/components/ui';
import { BadgesGrid, StreakCounter, SpeciesCollection, LeaderboardCard } from '@/components/Gamification';
import type { GamificationStats, SpeciesCollectionEntry } from '@/types/gamification';

interface ProfileGamificationProps {
  gamLoading: boolean;
  gamStats: GamificationStats | null;
  speciesCollection: SpeciesCollectionEntry[];
  userId: string | undefined;
}

export function ProfileGamification({ gamLoading, gamStats, speciesCollection, userId }: ProfileGamificationProps) {
  return (
    <>
      {/* Achievements & Badges */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-lg">
          <CardTitle className="flex items-center gap-2">
            <Icon name="trophy" className="text-amber-500" />
            Achievements &amp; Badges
          </CardTitle>
          <CardContent>
            {gamLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-400 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                <BadgesGrid earnedBadges={gamStats?.badges || []} />
                {gamStats?.streak && <StreakCounter streak={gamStats.streak} />}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Species Collection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <Card className="shadow-lg">
          <CardTitle className="flex items-center gap-2">
            <Icon name="fish" className="text-cyan-600" />
            Species Collection
            {speciesCollection.length > 0 && (
              <span className="ml-auto text-sm font-normal text-balean-gray-400">
                {speciesCollection.length} Species Discovered
              </span>
            )}
          </CardTitle>
          <CardContent>
            {gamLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-400 border-t-transparent" />
              </div>
            ) : (
              <SpeciesCollection collection={speciesCollection} />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
        <Card className="shadow-lg">
          <CardTitle className="flex items-center gap-2">
            <Icon name="chart-histogram" className="text-purple-600" />
            Leaderboard
          </CardTitle>
          <CardContent>
            <LeaderboardCard currentUserId={userId} />
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
