'use client';

/**
 * WindFarmConflictCard Component
 *
 * Displays nearby offshore wind farms that spatially overlap with an MPA.
 * Shows wind farm details (name, status, capacity) and highlights potential
 * conflicts between industrial development and marine conservation.
 */

import type { WindFarm } from '@/types/wind-farms';
import { WIND_FARM_STATUS_COLORS, WIND_FARM_STATUS_LABELS } from '@/types/wind-farms';
import type { WindFarmMPAConflict } from '@/types/wind-farms';

interface WindFarmConflictCardProps {
  conflicts: WindFarmMPAConflict[];
  nearbyWindFarms: WindFarm[];
  isLoading: boolean;
}

export function WindFarmConflictCard({
  conflicts,
  nearbyWindFarms,
  isLoading,
}: WindFarmConflictCardProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-orange-500 mb-4" />
        <p className="text-balean-gray-500 mb-2">Checking for nearby wind farms...</p>
        <p className="text-sm text-balean-gray-400">
          Data from EMODnet and OSPAR
        </p>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-50 mx-auto mb-4 flex items-center justify-center">
          <i className="fi fi-rr-check text-green-500 text-3xl" />
        </div>
        <p className="text-balean-gray-500 mb-2 font-medium">No wind farm conflicts detected</p>
        <p className="text-sm text-balean-gray-400 max-w-md mx-auto">
          No offshore wind farm developments were found overlapping with this Marine Protected Area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Conflict summary alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <i className="fi fi-rr-exclamation text-orange-600 text-lg" />
          </div>
          <div>
            <p className="font-semibold text-orange-800 text-sm">
              {conflicts.length} Wind Farm{conflicts.length !== 1 ? 's' : ''} Detected in MPA Zone
            </p>
            <p className="text-orange-700 text-xs mt-1">
              Offshore wind development boundaries overlap with this protected area.
              This may impact marine habitats and species within the MPA.
            </p>
          </div>
        </div>
      </div>

      {/* Individual wind farm cards */}
      <div className="space-y-3">
        {nearbyWindFarms.map((farm) => (
          <WindFarmItem key={farm.id} farm={farm} />
        ))}
      </div>

      {/* Data attribution */}
      <div className="pt-2 border-t border-balean-gray-100">
        <p className="text-[10px] text-balean-gray-400 text-center">
          Wind farm data from EMODnet Human Activities and OSPAR Commission (CC0).
          Conflict detection uses bounding box overlap approximation.
        </p>
      </div>
    </div>
  );
}

interface WindFarmItemProps {
  farm: WindFarm;
}

function formatCapacity(capacity: number): string {
  return capacity >= 1000
    ? `${(capacity / 1000).toFixed(1)} GW`
    : `${capacity} MW`;
}

function WindFarmItem({ farm }: WindFarmItemProps) {
  const statusColor = WIND_FARM_STATUS_COLORS[farm.status];
  const statusLabel = WIND_FARM_STATUS_LABELS[farm.status];

  return (
    <div className="bg-white border border-balean-gray-100 rounded-xl p-4 shadow-sm">
      <WindFarmItemHeader farm={farm} statusColor={statusColor} statusLabel={statusLabel} />
      <WindFarmStatsGrid farm={farm} />
      <WindFarmMetadata farm={farm} />
      {farm.source === 'merged' && (
        <div className="mt-2 pt-2 border-t border-balean-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-balean-gray-400 bg-balean-gray-50 px-1.5 py-0.5 rounded">EMODnet</span>
            <span className="text-[9px] text-balean-gray-400">+</span>
            <span className="text-[9px] text-balean-gray-400 bg-balean-gray-50 px-1.5 py-0.5 rounded">OSPAR</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WindFarmItemHeader({ farm, statusColor, statusLabel }: { farm: WindFarm; statusColor: string; statusLabel: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${statusColor}15` }}
        >
          <i className="fi fi-rr-wind text-lg" style={{ color: statusColor }} />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-balean-navy text-sm truncate">
            {farm.name}
          </h4>
          <p className="text-xs text-balean-gray-400 flex items-center gap-1 mt-0.5">
            <i className="fi fi-rr-marker text-[10px]" />
            {farm.country}
          </p>
        </div>
      </div>
      <span
        className="text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0"
        style={{ color: statusColor, backgroundColor: `${statusColor}15` }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

function WindFarmStatsGrid({ farm }: { farm: WindFarm }) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-balean-gray-100">
      {farm.capacity !== null && (
        <div className="text-center">
          <div className="text-sm font-bold text-balean-navy">{formatCapacity(farm.capacity)}</div>
          <div className="text-[10px] text-balean-gray-400">Capacity</div>
        </div>
      )}
      {farm.numberOfTurbines !== null && (
        <div className="text-center">
          <div className="text-sm font-bold text-balean-navy">{farm.numberOfTurbines}</div>
          <div className="text-[10px] text-balean-gray-400">Turbines</div>
        </div>
      )}
      {farm.yearCommissioned !== null ? (
        <div className="text-center">
          <div className="text-sm font-bold text-balean-navy">{farm.yearCommissioned}</div>
          <div className="text-[10px] text-balean-gray-400">Year</div>
        </div>
      ) : farm.distanceToCoast !== null ? (
        <div className="text-center">
          <div className="text-sm font-bold text-balean-navy">{farm.distanceToCoast.toFixed(0)} km</div>
          <div className="text-[10px] text-balean-gray-400">To Shore</div>
        </div>
      ) : null}
    </div>
  );
}

function MetadataRow({ label, value, className = 'text-balean-gray-600' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-balean-gray-400">{label}</span>
      <span className={`text-[10px] ${className}`}>{value}</span>
    </div>
  );
}

function WindFarmMetadata({ farm }: { farm: WindFarm }) {
  const hasMetadata = farm.operator || farm.foundation || farm.waterDepth || farm.hasEIA !== null;
  if (!hasMetadata) return null;

  return (
    <div className="mt-2 pt-2 border-t border-balean-gray-100 space-y-1">
      {farm.operator && <MetadataRow label="Operator" value={farm.operator} className="text-balean-gray-600 font-medium" />}
      {farm.foundation && <MetadataRow label="Foundation" value={farm.foundation} />}
      {farm.waterDepth && <MetadataRow label="Water Depth" value={farm.waterDepth} />}
      {farm.hasEIA !== null && (
        <MetadataRow
          label="EIA Conducted"
          value={farm.hasEIA ? 'Yes' : 'No'}
          className={`font-medium ${farm.hasEIA ? 'text-green-600' : 'text-red-500'}`}
        />
      )}
      {farm.deviceType && farm.deviceType !== 'wind turbine' && (
        <MetadataRow label="Type" value={farm.deviceType} className="text-balean-gray-600 capitalize" />
      )}
    </div>
  );
}
