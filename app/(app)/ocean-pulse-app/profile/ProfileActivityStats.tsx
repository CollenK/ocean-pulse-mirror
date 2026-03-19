'use client';

import { motion } from 'framer-motion';
import { Card, CardTitle, CardContent, Icon } from '@/components/ui';
import type { UserObservationStats } from '@/lib/observations-service';

interface ProfileActivityStatsProps {
  savedMPACount: number;
  statsLoading: boolean;
  userStats: UserObservationStats | null;
}

export function ProfileActivityStats({ savedMPACount, statsLoading, userStats }: ProfileActivityStatsProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-lg">
        <CardTitle className="flex items-center gap-2">
          <Icon name="chart-line" className="text-balean-cyan" />
          Activity Stats
        </CardTitle>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
              <p className="text-3xl font-bold text-red-500">{savedMPACount}</p>
              <p className="text-sm text-balean-gray-500">Saved MPAs</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl">
              {statsLoading ? (
                <div className="h-9 flex items-center justify-center">
                  <div className="animate-pulse bg-balean-gray-200 rounded w-8 h-8" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-balean-cyan">{userStats?.observationCount ?? 0}</p>
              )}
              <p className="text-sm text-balean-gray-500">Observations</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              {statsLoading ? (
                <div className="h-9 flex items-center justify-center">
                  <div className="animate-pulse bg-balean-gray-200 rounded w-8 h-8" />
                </div>
              ) : (
                <p className="text-3xl font-bold text-green-500">{userStats?.speciesCount ?? 0}</p>
              )}
              <p className="text-sm text-balean-gray-500">Species Found</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
