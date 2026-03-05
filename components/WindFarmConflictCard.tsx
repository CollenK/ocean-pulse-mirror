'use client';

/**
 * WindFarmConflictCard Component
 *
 * Displays nearby offshore wind farms that spatially overlap with an MPA.
 * Shows wind farm details (name, status, capacity) and highlights potential
 * conflicts between industrial development and marine conservation.
 */

import type { WindFarm, WindFarmStatus } from '@/types/wind-farms';
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

function WindFarmItem({ farm }: WindFarmItemProps) {
  const statusColor = WIND_FARM_STATUS_COLORS[farm.status];
  const statusLabel = WIND_FARM_STATUS_LABELS[farm.status];

  return (
    <div className="bg-white border border-balean-gray-100 rounded-xl p-4 shadow-sm">
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
          style={{
            color: statusColor,
            backgroundColor: `${statusColor}15`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-balean-gray-100">
        {farm.capacity !== null && (
          <div className="text-center">
            <div className="text-sm font-bold text-balean-navy">
              {farm.capacity >= 1000
                ? `${(farm.capacity / 1000).toFixed(1)} GW`
                : `${farm.capacity} MW`}
            </div>
            <div className="text-[10px] text-balean-gray-400">Capacity</div>
          </div>
        )}
        {farm.numberOfTurbines !== null && (
          <div className="text-center">
            <div className="text-sm font-bold text-balean-navy">
              {farm.numberOfTurbines}
            </div>
            <div className="text-[10px] text-balean-gray-400">Turbines</div>
          </div>
        )}
        {farm.yearCommissioned !== null ? (
          <div className="text-center">
            <div className="text-sm font-bold text-balean-navy">
              {farm.yearCommissioned}
            </div>
            <div className="text-[10px] text-balean-gray-400">Year</div>
          </div>
        ) : farm.distanceToCoast !== null ? (
          <div className="text-center">
            <div className="text-sm font-bold text-balean-navy">
              {farm.distanceToCoast.toFixed(0)} km
            </div>
            <div className="text-[10px] text-balean-gray-400">To Shore</div>
          </div>
        ) : null}
      </div>

      {/* OSPAR-enriched metadata */}
      {(farm.operator || farm.foundation || farm.waterDepth || farm.hasEIA !== null) && (
        <div className="mt-2 pt-2 border-t border-balean-gray-100 space-y-1">
          {farm.operator && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-400">Operator</span>
              <span className="text-[10px] text-balean-gray-600 font-medium">{farm.operator}</span>
            </div>
          )}
          {farm.foundation && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-400">Foundation</span>
              <span className="text-[10px] text-balean-gray-600">{farm.foundation}</span>
            </div>
          )}
          {farm.waterDepth && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-400">Water Depth</span>
              <span className="text-[10px] text-balean-gray-600">{farm.waterDepth}</span>
            </div>
          )}
          {farm.hasEIA !== null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-400">EIA Conducted</span>
              <span className={`text-[10px] font-medium ${farm.hasEIA ? 'text-green-600' : 'text-red-500'}`}>
                {farm.hasEIA ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {farm.deviceType && farm.deviceType !== 'wind turbine' && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-400">Type</span>
              <span className="text-[10px] text-balean-gray-600 capitalize">{farm.deviceType}</span>
            </div>
          )}
        </div>
      )}

      {/* Source badge */}
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
