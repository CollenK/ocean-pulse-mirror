'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVerificationFeed } from '@/hooks/useVerifications';
import { ObservationCard } from '@/components/ObservationCard';
import { VerificationPanel } from './VerificationPanel';
import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/Icon';

interface VerificationFeedProps {
  mpaId?: string;
}

export function VerificationFeed({ mpaId }: VerificationFeedProps) {
  const { observations, loading, refetch } = useVerificationFeed(mpaId);
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden">
            <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
              <div className="h-6 bg-gray-200 animate-pulse rounded w-24" />
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (observations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
          <Icon name="check-circle" className="text-green-500 text-2xl" />
        </div>
        <p className="text-gray-900 font-medium mb-2">All caught up</p>
        <p className="text-sm text-gray-500">
          No observations need verification right now
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {observations.length} observation{observations.length !== 1 ? 's' : ''} awaiting verification
      </p>

      {observations.map(observation => (
        <motion.div
          key={observation.id}
          layout
          className="space-y-0"
        >
          <ObservationCard
            observation={observation}
            currentUserId={user?.id}
            onViewDetails={() =>
              setExpandedId(prev => prev === observation.id ? null : observation.id)
            }
            onVerify={
              user?.id && user.id !== observation.user_id
                ? () => setExpandedId(prev => prev === observation.id ? null : observation.id)
                : undefined
            }
          />

          <AnimatePresence>
            {expandedId === observation.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-t-0 border-gray-200 rounded-b-2xl p-4 -mt-3">
                  <VerificationPanel
                    observation={observation}
                    onVerificationComplete={() => {
                      setExpandedId(null);
                      refetch();
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
