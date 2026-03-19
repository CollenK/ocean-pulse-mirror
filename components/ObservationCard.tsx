'use client';

import { useState, useMemo } from 'react';
import { REPORT_TYPES } from '@/types';
import type { LitterTallyEntry } from '@/types/marine-litter';
import { Badge, Button, Modal, QualityTierBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { ObservationWithProfile } from '@/lib/observations-service';
import type { QualityTier } from '@/types/verification';

// Simple relative time formatter
function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

function getReportTypeBadgeVariant(type: string): 'info' | 'healthy' | 'warning' | 'at-risk' {
  switch (type) {
    case 'species_sighting': return 'info';
    case 'habitat_condition': return 'healthy';
    case 'water_quality': return 'info';
    case 'threat_concern': return 'at-risk';
    case 'enforcement_activity': return 'warning';
    case 'research_observation': return 'healthy';
    case 'marine_litter': return 'healthy';
    default: return 'info';
  }
}

function generateUsername(userId?: string | null, id?: string): string {
  const names = [
    'Ocean_Explorer', 'Marine_Researcher', 'Reef_Guardian', 'Sea_Watcher', 'Dive_Observer',
    'Coastal_Scout', 'Wave_Ranger', 'Tide_Tracker', 'Coral_Keeper', 'Conservation_Volunteer',
  ];
  const seed = userId ? userId.charCodeAt(0) : (id ? id.charCodeAt(0) : 0);
  return names[seed % names.length];
}

function parseLitterSummary(observation: ObservationWithProfile) {
  if (observation.report_type !== 'marine_litter') return null;
  let totalItems = 0;
  try {
    const items: LitterTallyEntry[] = observation.litter_items
      ? (typeof observation.litter_items === 'string' ? JSON.parse(observation.litter_items) : observation.litter_items)
      : [];
    totalItems = items.reduce((sum, e) => sum + e.count, 0);
  } catch { /* empty */ }
  return {
    totalItems,
    weight: observation.litter_weight_kg,
    surveyLengthM: observation.survey_length_m,
    itemsPer100m: observation.survey_length_m && totalItems > 0
      ? Math.round((totalItems / observation.survey_length_m) * 100)
      : null,
  };
}

function LitterSummaryRow({ summary }: { summary: NonNullable<ReturnType<typeof parseLitterSummary>> }) {
  return (
    <div className="flex items-center gap-3 mb-3 px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-lg">
      <i className="fi fi-rr-trash text-teal-500 text-sm" />
      <div className="flex items-center gap-3 flex-wrap text-xs">
        {summary.totalItems > 0 && (
          <span className="text-gray-700"><span className="font-semibold text-teal-700">{summary.totalItems}</span> items</span>
        )}
        {summary.weight != null && (
          <span className="text-gray-700"><span className="font-semibold text-teal-700">{summary.weight} kg</span></span>
        )}
        {summary.itemsPer100m != null && (
          <span className="text-gray-700"><span className="font-semibold text-teal-700">{summary.itemsPer100m}</span> /100m</span>
        )}
        {summary.surveyLengthM && (
          <span className="text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded text-[10px] font-medium">OSPAR {summary.surveyLengthM}m</span>
        )}
      </div>
    </div>
  );
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Observation" size="sm">
      <div className="space-y-4">
        <p className="text-gray-600">Are you sure you want to delete this observation? This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>Cancel</Button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700" fullWidth>Delete</Button>
        </div>
      </div>
    </Modal>
  );
}

function CardActions({ observation, isOwner, onVerify, onEdit, onDelete, onShowDelete }: {
  observation: ObservationWithProfile; isOwner: boolean | null | undefined;
  onVerify?: (o: ObservationWithProfile) => void;
  onEdit?: (o: ObservationWithProfile) => void;
  onDelete?: (id: string) => void;
  onShowDelete: () => void;
}) {
  return (
    <>
      {!isOwner && onVerify && observation.quality_tier === 'needs_id' && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => onVerify(observation)} fullWidth className="border-balean-cyan text-balean-cyan hover:bg-cyan-50">
            <Icon name="check-circle" size="sm" /> Verify Observation
          </Button>
        </div>
      )}
      {isOwner && (onEdit || onDelete) && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          {onEdit && <Button variant="secondary" size="sm" onClick={() => onEdit(observation)} className="flex-1"><Icon name="edit" size="sm" /> Edit</Button>}
          {onDelete && <Button variant="secondary" size="sm" onClick={onShowDelete} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"><Icon name="trash" size="sm" /> Delete</Button>}
        </div>
      )}
    </>
  );
}

function CardUserRow({ observation }: { observation: ObservationWithProfile }) {
  const displayName = observation.profiles?.display_name || generateUsername(observation.user_id, observation.id);
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      <span className="font-medium text-gray-900">{displayName}</span>
      {observation.synced_at && (
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      <span className="text-sm text-gray-400 ml-auto">{formatTimeAgo(observation.observed_at)}</span>
    </div>
  );
}

function CardBadges({ observation }: { observation: ObservationWithProfile }) {
  const reportTypeInfo = observation.report_type ? REPORT_TYPES[observation.report_type] : null;
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {reportTypeInfo && <Badge variant={getReportTypeBadgeVariant(observation.report_type)} size="sm">{reportTypeInfo.label}</Badge>}
      {observation.quality_tier && <QualityTierBadge tier={observation.quality_tier as QualityTier} size="sm" verificationCount={observation.verification_count} />}
    </div>
  );
}

function CardFooter({ observation, onViewDetails }: { observation: ObservationWithProfile; onViewDetails?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      {observation.health_score_assessment ? (
        <div className="flex items-center gap-2"><span className="text-sm text-gray-500">Impact Score:</span><span className="font-bold text-gray-900">{observation.health_score_assessment.toFixed(1)}</span></div>
      ) : <div />}
      {onViewDetails && <button onClick={onViewDetails} className="text-sm text-blue-500 hover:text-blue-600 font-medium">View Details</button>}
    </div>
  );
}

interface ObservationCardProps {
  observation: ObservationWithProfile;
  currentUserId?: string | null;
  onViewDetails?: () => void;
  onEdit?: (observation: ObservationWithProfile) => void;
  onDelete?: (observationId: string) => void;
  onVerify?: (observation: ObservationWithProfile) => void;
}

export function ObservationCard({
  observation, currentUserId, onViewDetails, onEdit, onDelete, onVerify,
}: ObservationCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isOwner = !!(currentUserId && observation.user_id === currentUserId);
  const litterSummary = useMemo(() => parseLitterSummary(observation), [observation.report_type, observation.litter_items, observation.litter_weight_kg, observation.survey_length_m]);
  const hasCommunitySuggestion = observation.community_species_name && observation.community_species_name !== observation.species_name;
  const showLitter = litterSummary && (litterSummary.totalItems > 0 || litterSummary.weight);

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {observation.photo_url && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img src={observation.photo_url} alt="Observation" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <CardUserRow observation={observation} />
        <CardBadges observation={observation} />
        {hasCommunitySuggestion && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <i className="fi fi-rr-users-alt text-amber-600 text-xs" />
            <p className="text-xs text-amber-800">Community suggests: <span className="font-medium italic">{observation.community_species_name}</span></p>
          </div>
        )}
        {showLitter && <LitterSummaryRow summary={litterSummary} />}
        {observation.notes && <p className="text-gray-700 mb-4 leading-relaxed">{observation.notes}</p>}
        <CardFooter observation={observation} onViewDetails={onViewDetails} />
        <CardActions observation={observation} isOwner={isOwner} onVerify={onVerify} onEdit={onEdit} onDelete={onDelete} onShowDelete={() => setShowDeleteConfirm(true)} />
      </div>
      <DeleteConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={() => { onDelete?.(observation.id); setShowDeleteConfirm(false); }} />
    </div>
  );
}
