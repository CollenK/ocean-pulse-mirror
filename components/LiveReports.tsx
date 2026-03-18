'use client';

import { useState, useMemo } from 'react';
import { useObservations } from '@/hooks/useObservations';
import { useAuth } from '@/hooks/useAuth';
import { ObservationCard } from './ObservationCard';
import { EditObservationModal } from './Observation/EditObservationModal';
import { ObservationDetailModal } from './Observation/ObservationDetailModal';
import { VerificationPanel } from './Verification/VerificationPanel';
import { Button, Icon, Modal } from '@/components/ui';
import { deleteObservation, type ObservationWithProfile } from '@/lib/observations-service';
import Link from 'next/link';

type TierFilter = 'all' | 'needs_id' | 'community_verified' | 'research_grade';

const TIER_FILTERS: { id: TierFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: 'fi-rr-list' },
  { id: 'needs_id', label: 'Unverified', icon: 'fi-rr-interrogation' },
  { id: 'community_verified', label: 'Verified', icon: 'fi-rr-check-circle' },
  { id: 'research_grade', label: 'Research Grade', icon: 'fi-rr-diploma' },
];

interface LiveReportsProps {
  mpaId: string;
  maxHeight?: number;
}

export function LiveReports({ mpaId, maxHeight = 500 }: LiveReportsProps) {
  const { observations, loading, refetch } = useObservations(mpaId);
  const { user } = useAuth();
  const [editingObservation, setEditingObservation] = useState<ObservationWithProfile | null>(null);
  const [_deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [verifyingObservation, setVerifyingObservation] = useState<ObservationWithProfile | null>(null);
  const [viewingObservation, setViewingObservation] = useState<ObservationWithProfile | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const filteredObservations = useMemo(() => {
    if (tierFilter === 'all') return observations;
    return observations.filter(o => o.quality_tier === tierFilter);
  }, [observations, tierFilter]);

  const handleEdit = (observation: ObservationWithProfile) => {
    setEditingObservation(observation);
  };

  const handleDelete = async (observationId: string) => {
    if (!user?.id) return;

    setDeleteLoading(observationId);
    const result = await deleteObservation(observationId, user.id);

    if (result.success) {
      await refetch();
    } else {
      console.error('Failed to delete observation:', result.error);
    }

    setDeleteLoading(null);
  };

  const handleEditSuccess = async () => {
    await refetch();
    setEditingObservation(null);
  };

  const handleVerify = (observation: ObservationWithProfile) => {
    setVerifyingObservation(observation);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Loading skeleton */}
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                <div className="h-6 bg-gray-200 animate-pulse rounded w-24" />
                <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
                <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quality tier filter pills */}
      {observations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TIER_FILTERS.map(filter => {
            const isActive = tierFilter === filter.id;
            const count = filter.id === 'all'
              ? observations.length
              : observations.filter(o => o.quality_tier === filter.id).length;
            return (
              <button
                key={filter.id}
                onClick={() => setTierFilter(filter.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${isActive
                    ? 'bg-balean-cyan text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                <i className={`fi ${filter.icon}`} />
                <span>{filter.label}</span>
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded-full
                  ${isActive ? 'bg-white/20' : 'bg-gray-200'}
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable reports list */}
      {filteredObservations.length > 0 ? (
        <div
          className="overflow-y-auto space-y-6 pr-2 -mr-2"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {filteredObservations.map((observation) => (
            <ObservationCard
              key={observation.id}
              observation={observation}
              currentUserId={user?.id}
              onViewDetails={() => setViewingObservation(observation)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onVerify={handleVerify}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="camera" className="text-blue-500 text-2xl" />
          </div>
          <p className="text-gray-900 font-medium mb-2">
            {tierFilter === 'all' ? 'No reports yet' : 'No matching reports'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {tierFilter === 'all'
              ? 'Be the first to share an observation for this MPA'
              : 'Try a different filter to see more reports'
            }
          </p>
        </div>
      )}

      {/* Submit Report Button */}
      <Link href={`/ocean-pulse-app/observe?mpa=${mpaId}`} className="block">
        <Button fullWidth size="lg" className="rounded-xl">
          <Icon name="camera" size="sm" />
          Submit Report
        </Button>
      </Link>

      {/* Edit Observation Modal */}
      {editingObservation && user?.id && (
        <EditObservationModal
          observation={editingObservation}
          userId={user.id}
          isOpen={!!editingObservation}
          onClose={() => setEditingObservation(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Observation Detail Modal */}
      <ObservationDetailModal
        observation={viewingObservation}
        isOpen={!!viewingObservation}
        onClose={() => setViewingObservation(null)}
        currentUserId={user?.id}
        onVerificationComplete={() => {
          setViewingObservation(null);
          refetch();
        }}
      />

      {/* Verification Modal */}
      <Modal
        isOpen={!!verifyingObservation}
        onClose={() => setVerifyingObservation(null)}
        title="Verify Species ID"
        size="md"
      >
        {verifyingObservation && (
          <div className="space-y-4">
            {/* Photo */}
            {verifyingObservation.photo_url && (
              <img
                src={verifyingObservation.photo_url}
                alt="Observation photo"
                className="w-full h-52 object-cover rounded-xl"
              />
            )}

            {/* Observer notes for context */}
            {verifyingObservation.notes && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                {verifyingObservation.notes}
              </p>
            )}

            <VerificationPanel
              observation={verifyingObservation}
              onVerificationComplete={() => {
                setVerifyingObservation(null);
                refetch();
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
