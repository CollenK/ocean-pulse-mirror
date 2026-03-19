'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardTitle, CardContent, Icon } from '@/components/ui';
import type { UserObservationStats } from '@/lib/observations-service';
import type { VerificationStats } from '@/types/verification';

interface ProfileImpactProps {
  statsLoading: boolean;
  userStats: UserObservationStats | null;
  verificationStats: VerificationStats | null;
}

export function ProfileImpact({ statsLoading, userStats, verificationStats }: ProfileImpactProps) {
  return (
    <>
      {/* Your Impact */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-lg">
          <CardTitle className="flex items-center gap-2">
            <Icon name="heart-rate" className="text-amber-600" />
            Your Impact
          </CardTitle>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-balean-cyan border-t-transparent" />
              </div>
            ) : userStats && userStats.healthAssessmentCount > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-balean-gray-600">
                  You have contributed {userStats.healthAssessmentCount} health assessment{userStats.healthAssessmentCount !== 1 ? 's' : ''} across {userStats.mpasContributed} MPA{userStats.mpasContributed !== 1 ? 's' : ''}.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-600">{userStats.healthAssessmentCount}</p>
                    <p className="text-xs text-balean-gray-500">Assessments</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-600">{userStats.averageHealthScore ?? '-'}</p>
                    <p className="text-xs text-balean-gray-500">Avg. Score</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto mb-3 flex items-center justify-center">
                  <Icon name="star" className="text-amber-400 text-xl" />
                </div>
                <p className="text-sm text-balean-gray-500 mb-1">No health assessments yet</p>
                <p className="text-xs text-balean-gray-400">
                  Start contributing by submitting observations with health assessments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Verification Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="shadow-lg">
          <CardTitle className="flex items-center gap-2">
            <Icon name="check-circle" className="text-balean-cyan" />
            Verification Activity
          </CardTitle>
          <CardContent>
            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-balean-cyan border-t-transparent" />
              </div>
            ) : verificationStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-balean-cyan">{verificationStats.total_verifications}</p>
                    <p className="text-xs text-balean-gray-500">Verifications</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-green-500">{verificationStats.agreements}</p>
                    <p className="text-xs text-balean-gray-500">Agreements</p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-amber-600">{verificationStats.suggestions}</p>
                    <p className="text-xs text-balean-gray-500">Suggestions</p>
                  </div>
                </div>
                <Link
                  href="/ocean-pulse-app/verify"
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg bg-balean-cyan/5 hover:bg-balean-cyan/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="check-circle" className="text-balean-cyan" />
                    <span className="font-medium text-balean-navy">Help Verify Observations</span>
                  </div>
                  <Icon name="angle-right" className="text-balean-gray-300" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-cyan-50 mx-auto mb-3 flex items-center justify-center">
                  <Icon name="check-circle" className="text-balean-cyan text-xl" />
                </div>
                <p className="text-sm text-balean-gray-500 mb-1">No verifications yet</p>
                <p className="text-xs text-balean-gray-400 mb-3">
                  Help improve data quality by verifying species identifications
                </p>
                <Link
                  href="/ocean-pulse-app/verify"
                  className="text-sm font-medium text-balean-cyan hover:text-balean-cyan/80"
                >
                  Start Verifying
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
