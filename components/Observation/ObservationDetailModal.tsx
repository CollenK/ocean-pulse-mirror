'use client';

import { useMemo } from 'react';
import { REPORT_TYPES } from '@/types';
import { Badge, Modal, QualityTierBadge } from '@/components/ui';
import { VerificationPanel } from '@/components/Verification/VerificationPanel';
import { MATERIAL_CONFIG, type LitterTallyEntry, type LitterMaterial } from '@/types/marine-litter';
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
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
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
    case 'marine_litter': return 'healthy';
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

function parseLitterItems(observation: ObservationWithProfile): LitterTallyEntry[] {
  if (observation.report_type !== 'marine_litter' || !observation.litter_items) return [];
  try {
    const parsed = typeof observation.litter_items === 'string'
      ? JSON.parse(observation.litter_items)
      : observation.litter_items;
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function LitterSummaryStats({ observation, litterTotalItems, litterItems }: {
  observation: ObservationWithProfile;
  litterTotalItems: number;
  litterItems: LitterTallyEntry[];
}) {
  return (
    <div className="bg-teal-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <i className="fi fi-rr-trash text-teal-600" />
        <span className="text-sm font-medium text-gray-700">Litter Report Summary</span>
        {observation.survey_length_m && <Badge variant="info" size="sm">OSPAR Survey</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {litterTotalItems > 0 && (
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{litterTotalItems}</p>
            <p className="text-xs text-gray-500">items found</p>
          </div>
        )}
        {observation.litter_weight_kg != null && (
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{observation.litter_weight_kg} kg</p>
            <p className="text-xs text-gray-500">total weight</p>
          </div>
        )}
        {observation.survey_length_m && litterTotalItems > 0 && (
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{Math.round((litterTotalItems / observation.survey_length_m) * 100)}</p>
            <p className="text-xs text-gray-500">items / 100m</p>
          </div>
        )}
        {observation.survey_length_m && (
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{observation.survey_length_m}m</p>
            <p className="text-xs text-gray-500">transect length</p>
          </div>
        )}
        {litterItems.length > 0 && (
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{litterItems.length}</p>
            <p className="text-xs text-gray-500">categories</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialBreakdown({ litterByMaterial, litterTotalItems }: {
  litterByMaterial: [string, { items: LitterTallyEntry[]; total: number }][];
  litterTotalItems: number;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <i className="fi fi-rr-chart-pie text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Material Breakdown</span>
      </div>
      <div className="space-y-2">
        {litterByMaterial.map(([material, data]) => {
          const config = MATERIAL_CONFIG[material as LitterMaterial] || MATERIAL_CONFIG.other;
          const pct = litterTotalItems > 0 ? (data.total / litterTotalItems) * 100 : 0;
          return (
            <div key={material}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                <span className="text-xs text-gray-500">{data.total} ({Math.round(pct)}%)</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${config.bg} border ${config.color.replace('text-', 'border-')}`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LitterItemsList({ litterItems }: { litterItems: LitterTallyEntry[] }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="fi fi-rr-list text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Items Found</span>
        </div>
        <span className="text-xs text-gray-400">{litterItems.length} types</span>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {[...litterItems].sort((a, b) => b.count - a.count).map((item) => {
          const config = MATERIAL_CONFIG[item.material as LitterMaterial] || MATERIAL_CONFIG.other;
          return (
            <div key={item.code} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.bg} border ${config.color.replace('text-', 'border-')}`} />
                <span className="text-sm text-gray-800 truncate">{item.name}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{item.code}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">{item.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ObserverHeader({ observation, displayName }: { observation: ObservationWithProfile; displayName: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {observation.profiles?.avatar_url ? (
          <img src={observation.profiles.avatar_url} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-balean-cyan/10 flex items-center justify-center">
            <span className="text-sm font-medium text-balean-cyan">{displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          <p className="text-xs text-gray-400">{formatDate(observation.observed_at)}</p>
        </div>
      </div>
      {observation.synced_at && (
        <span className="text-[10px] text-gray-400 flex items-center gap-1"><i className="fi fi-rr-cloud-check text-green-500" /> Synced</span>
      )}
    </div>
  );
}

function SpeciesInfo({ observation }: { observation: ObservationWithProfile }) {
  if (!observation.species_name) return null;
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2"><i className="fi fi-rr-fish text-balean-cyan" /><span className="text-sm font-medium text-gray-500">Species Identification</span></div>
      <p className="text-lg font-semibold text-gray-900 italic">{observation.species_name}</p>
      {observation.community_species_name && observation.community_species_name !== observation.species_name && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <i className="fi fi-rr-users-alt text-amber-600 text-xs" />
          <p className="text-xs text-amber-800">Community suggests: <span className="font-medium italic">{observation.community_species_name}</span></p>
        </div>
      )}
      {observation.species_type && <p className="text-xs text-gray-400">Type: {observation.species_type}</p>}
      {observation.quantity && <p className="text-xs text-gray-400">Quantity observed: {observation.quantity}</p>}
    </div>
  );
}

function ObservationDetailsGrid({ observation }: { observation: ObservationWithProfile }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1"><i className="fi fi-rr-marker text-balean-cyan text-xs" /><span className="text-xs font-medium text-gray-500">Location</span></div>
        <p className="text-sm text-gray-900">{observation.latitude.toFixed(4)}, {observation.longitude.toFixed(4)}</p>
        {observation.location_accuracy_m && <p className="text-[10px] text-gray-400 mt-0.5">Accuracy: {Math.round(observation.location_accuracy_m)}m</p>}
      </div>
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1"><i className="fi fi-rr-heart-rate text-balean-cyan text-xs" /><span className="text-xs font-medium text-gray-500">Health Score</span></div>
        {observation.health_score_assessment ? (
          <p className="text-sm font-semibold text-gray-900">{observation.health_score_assessment.toFixed(1)}<span className="text-gray-400 font-normal">/10</span></p>
        ) : (
          <p className="text-sm text-gray-400">Not assessed</p>
        )}
      </div>
    </div>
  );
}

function groupLitterByMaterial(litterItems: LitterTallyEntry[]) {
  const groups: Record<string, { items: LitterTallyEntry[]; total: number }> = {};
  for (const item of litterItems) {
    if (!groups[item.material]) groups[item.material] = { items: [], total: 0 };
    groups[item.material].items.push(item);
    groups[item.material].total += item.count;
  }
  return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
}

function ObservationBadges({ observation }: { observation: ObservationWithProfile }) {
  const reportTypeInfo = observation.report_type ? REPORT_TYPES[observation.report_type] : null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reportTypeInfo && <Badge variant={getReportTypeBadgeVariant(observation.report_type)} size="sm">{reportTypeInfo.label}</Badge>}
      {observation.quality_tier && <QualityTierBadge tier={observation.quality_tier as QualityTier} size="sm" verificationCount={observation.verification_count} />}
    </div>
  );
}

function LitterSection({ observation }: { observation: ObservationWithProfile }) {
  const litterItems = useMemo(() => parseLitterItems(observation), [observation.litter_items, observation.report_type]);
  const litterTotalItems = useMemo(() => litterItems.reduce((sum, e) => sum + e.count, 0), [litterItems]);
  const litterByMaterial = useMemo(() => groupLitterByMaterial(litterItems), [litterItems]);
  const showLitter = observation.report_type === 'marine_litter' && (litterItems.length > 0 || observation.litter_weight_kg);

  if (!showLitter) return null;
  return (
    <div className="space-y-4">
      <LitterSummaryStats observation={observation} litterTotalItems={litterTotalItems} litterItems={litterItems} />
      {litterByMaterial.length > 0 && <MaterialBreakdown litterByMaterial={litterByMaterial} litterTotalItems={litterTotalItems} />}
      {litterItems.length > 0 && <LitterItemsList litterItems={litterItems} />}
    </div>
  );
}

export function ObservationDetailModal({
  observation, isOpen, onClose, currentUserId, onVerificationComplete,
}: ObservationDetailModalProps) {
  if (!observation) return null;

  const displayName = observation.profiles?.display_name || generateUsername(observation.user_id, observation.id);
  const isOwner = currentUserId === observation.user_id;
  const showVerification = !isOwner && !!observation.quality_tier;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Observation Details" size="lg">
      <div className="space-y-5 -mt-2">
        {observation.photo_url && <img src={observation.photo_url} alt="Observation photo" className="w-full max-h-80 object-cover rounded-xl" />}
        <ObserverHeader observation={observation} displayName={displayName} />
        <ObservationBadges observation={observation} />
        <SpeciesInfo observation={observation} />
        <LitterSection observation={observation} />
        {observation.notes && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed">{observation.notes}</p>
          </div>
        )}
        <ObservationDetailsGrid observation={observation} />
        {showVerification && (
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center gap-2 mb-3"><i className="fi fi-rr-check-circle text-balean-cyan" /><span className="text-sm font-medium text-gray-700">Community Verification</span></div>
            <VerificationPanel observation={observation} onVerificationComplete={onVerificationComplete} />
          </div>
        )}
      </div>
    </Modal>
  );
}
