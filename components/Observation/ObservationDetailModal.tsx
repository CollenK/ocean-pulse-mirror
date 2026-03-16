'use client';

import { REPORT_TYPES } from '@/types';
import { Badge, Modal, QualityTierBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { VerificationPanel } from '@/components/Verification/VerificationPanel';
import type { ObservationWithProfile } from '@/lib/observations-service';
import type { QualityTier } from '@/types/verification';

interface ObservationDetailModalProps {
  observation: ObservationWithProfile | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  onVerificationComplete?: () => void;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getReportTypeBadgeVariant(type: string): 'info' | 'healthy' | 'warning' | 'at-risk' {
  switch (type) {
    case 'species_sighting': return 'info';
    case 'habitat_condition': return 'healthy';
    case 'water_quality': return 'info';
    case 'threat_concern': return 'at-risk';
    case 'enforcement_activity': return 'warning';
    case 'research_observation': return 'healthy';
    default: return 'info';
  }
}

function generateUsername(userId?: string | null, id?: string): string {
  const names = [
    'Ocean Explorer', 'Marine Researcher', 'Reef Guardian',
    'Sea Watcher', 'Dive Observer', 'Coastal Scout',
    'Wave Ranger', 'Tide Tracker', 'Coral Keeper', 'Conservation Volunteer',
  ];
  const seed = userId ? userId.charCodeAt(0) : (id ? id.charCodeAt(0) : 0);
  return names[seed % names.length];
}

export function ObservationDetailModal({
  observation,
  isOpen,
  onClose,
  currentUserId,
  onVerificationComplete,
}: ObservationDetailModalProps) {
  if (!observation) return null;

  const reportTypeInfo = observation.report_type ? REPORT_TYPES[observation.report_type] : null;
  const displayName = observation.profiles?.display_name || generateUsername(observation.user_id, observation.id);
  const isOwner = currentUserId === observation.user_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Observation Details"
      size="lg"
    >
      <div className="space-y-5 -mt-2">
        {/* Photo */}
        {observation.photo_url && (
          <img
            src={observation.photo_url}
            alt="Observation photo"
            className="w-full max-h-80 object-cover rounded-xl"
          />
        )}

        {/* Observer + date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {observation.profiles?.avatar_url ? (
              <img
                src={observation.profiles.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-balean-cyan/10 flex items-center justify-center">
                <span className="text-sm font-medium text-balean-cyan">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-400">{formatDate(observation.observed_at)}</p>
            </div>
          </div>
          {observation.synced_at && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <i className="fi fi-rr-cloud-check text-green-500" />
              Synced
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {reportTypeInfo && (
            <Badge variant={getReportTypeBadgeVariant(observation.report_type)} size="sm">
              {reportTypeInfo.label}
            </Badge>
          )}
          {observation.quality_tier && (
            <QualityTierBadge
              tier={observation.quality_tier as QualityTier}
              size="sm"
              verificationCount={observation.verification_count}
            />
          )}
        </div>

        {/* Species info */}
        {observation.species_name && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <i className="fi fi-rr-fish text-balean-cyan" />
              <span className="text-sm font-medium text-gray-500">Species Identification</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 italic">{observation.species_name}</p>
            {observation.community_species_name &&
              observation.community_species_name !== observation.species_name && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <i className="fi fi-rr-users-alt text-amber-600 text-xs" />
                <p className="text-xs text-amber-800">
                  Community suggests: <span className="font-medium italic">{observation.community_species_name}</span>
                </p>
              </div>
            )}
            {observation.species_type && (
              <p className="text-xs text-gray-400">Type: {observation.species_type}</p>
            )}
            {observation.quantity && (
              <p className="text-xs text-gray-400">Quantity observed: {observation.quantity}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {observation.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed">{observation.notes}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Location */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <i className="fi fi-rr-marker text-balean-cyan text-xs" />
              <span className="text-xs font-medium text-gray-500">Location</span>
            </div>
            <p className="text-sm text-gray-900">
              {observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}
            </p>
            {observation.location_accuracy_m && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                Accuracy: {Math.round(observation.location_accuracy_m)}m
              </p>
            )}
          </div>

          {/* Health score */}
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <i className="fi fi-rr-heart-rate text-balean-cyan text-xs" />
              <span className="text-xs font-medium text-gray-500">Health Score</span>
            </div>
            {observation.health_score_assessment ? (
              <p className="text-sm font-semibold text-gray-900">
                {observation.health_score_assessment.toFixed(1)}<span className="text-gray-400 font-normal">/10</span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">Not assessed</p>
            )}
          </div>
        </div>

        {/* Verification section */}
        {!isOwner && observation.quality_tier && (
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <i className="fi fi-rr-check-circle text-balean-cyan" />
              <span className="text-sm font-medium text-gray-700">Community Verification</span>
            </div>
            <VerificationPanel
              observation={observation}
              onVerificationComplete={onVerificationComplete}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
