'use client';

import { useState } from 'react';
import { REPORT_TYPES } from '@/types';
import { Badge, Button, Modal } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { ObservationWithProfile } from '@/lib/observations-service';

// Simple relative time formatter
function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days}d ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks}w ago`;
  }
  const months = Math.floor(seconds / 2592000);
  return `${months}mo ago`;
}

// Get badge variant based on report type
function getReportTypeBadgeVariant(type: string): 'info' | 'healthy' | 'warning' | 'at-risk' {
  switch (type) {
    case 'species_sighting':
      return 'info';
    case 'habitat_condition':
      return 'healthy';
    case 'water_quality':
      return 'info';
    case 'threat_concern':
      return 'at-risk';
    case 'enforcement_activity':
      return 'warning';
    case 'research_observation':
      return 'healthy';
    default:
      return 'info';
  }
}

// Generate anonymous username from ID
function generateUsername(userId?: string | null, id?: string): string {
  const names = [
    'Ocean_Explorer',
    'Marine_Researcher',
    'Reef_Guardian',
    'Sea_Watcher',
    'Dive_Observer',
    'Coastal_Scout',
    'Wave_Ranger',
    'Tide_Tracker',
    'Coral_Keeper',
    'Conservation_Volunteer',
  ];

  const seed = userId ? userId.charCodeAt(0) : (id ? id.charCodeAt(0) : 0);
  return names[seed % names.length];
}

interface ObservationCardProps {
  observation: ObservationWithProfile;
  currentUserId?: string | null;
  onViewDetails?: () => void;
  onEdit?: (observation: ObservationWithProfile) => void;
  onDelete?: (observationId: string) => void;
}

export function ObservationCard({
  observation,
  currentUserId,
  onViewDetails,
  onEdit,
  onDelete,
}: ObservationCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOwner = currentUserId && observation.user_id === currentUserId;
  const reportTypeInfo = observation.report_type
    ? REPORT_TYPES[observation.report_type]
    : null;

  const timeAgo = formatTimeAgo(observation.observed_at);
  const displayName = observation.profiles?.display_name || generateUsername(observation.user_id, observation.id);
  const isSynced = !!observation.synced_at;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Photo */}
      {observation.photo_url && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={observation.photo_url}
            alt="Observation"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* User info row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="font-medium text-gray-900">{displayName}</span>
          {isSynced && (
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="text-sm text-gray-400 ml-auto">{timeAgo}</span>
        </div>

        {/* Report type badge */}
        {reportTypeInfo && (
          <div className="mb-3">
            <Badge
              variant={getReportTypeBadgeVariant(observation.report_type)}
              size="sm"
            >
              {reportTypeInfo.label}
            </Badge>
          </div>
        )}

        {/* Notes/Description */}
        {observation.notes && (
          <p className="text-gray-700 mb-4 leading-relaxed">
            {observation.notes}
          </p>
        )}

        {/* Bottom row: Impact Score and View Details */}
        <div className="flex items-center justify-between">
          {observation.health_score_assessment ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Impact Score:</span>
              <span className="font-bold text-gray-900">
                {observation.health_score_assessment.toFixed(1)}
              </span>
            </div>
          ) : (
            <div />
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              View Details
            </button>
          )}
        </div>

        {/* Edit/Delete buttons for owner */}
        {isOwner && (onEdit || onDelete) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(observation)}
                className="flex-1"
              >
                <Icon name="edit" size="sm" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Icon name="trash" size="sm" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Observation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this observation? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDelete?.(observation.id);
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700"
              fullWidth
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
