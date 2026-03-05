'use client';

/**
 * WindFarmLegend Component
 *
 * Displays a legend for the wind farm layer, showing color codes for
 * each development status along with summary statistics and conflict count.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  WIND_FARM_STATUS_COLORS,
  WIND_FARM_STATUS_LABELS,
  type WindFarmStatus,
  type WindFarmSummary,
} from '@/types/wind-farms';

interface WindFarmLegendProps {
  visible: boolean;
  summary?: WindFarmSummary | null;
}

// Display order for status items in the legend
const STATUS_DISPLAY_ORDER: WindFarmStatus[] = [
  'Production',
  'Under Construction',
  'Authorised',
  'Pre-Construction',
  'Planned',
  'Concept/Early Planning',
  'Decommissioned',
];

export function WindFarmLegend({ visible, summary }: WindFarmLegendProps) {
  if (!visible) return null;

  const formatCapacity = (mw: number): string => {
    if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
    return `${mw.toFixed(0)} MW`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-24 left-4 z-10 bg-white rounded-xl shadow-lg p-3 max-w-[200px]"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <i className="fi fi-rr-wind text-orange-500 text-sm" />
          <span className="text-xs font-semibold text-balean-navy">Offshore Wind Farms</span>
        </div>

        {/* Status legend items */}
        <div className="space-y-1 mb-2">
          {STATUS_DISPLAY_ORDER.map((status) => {
            const count = summary?.byStatus[status] ?? 0;
            if (!summary || count > 0) {
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm border border-black/10"
                      style={{ backgroundColor: WIND_FARM_STATUS_COLORS[status] }}
                    />
                    <span className="text-[10px] text-balean-gray-600">
                      {WIND_FARM_STATUS_LABELS[status]}
                    </span>
                  </div>
                  {summary && (
                    <span className="text-[10px] text-balean-gray-400 ml-2">
                      {count}
                    </span>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="border-t border-balean-gray-100 pt-2 mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-balean-gray-500">Total Farms</span>
              <span className="text-xs font-medium text-balean-navy">
                {summary.totalFarms}
              </span>
            </div>
            {summary.totalCapacityMW > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-balean-gray-500">Total Capacity</span>
                <span className="text-xs font-medium text-balean-navy">
                  {formatCapacity(summary.totalCapacityMW)}
                </span>
              </div>
            )}
            {summary.conflictsWithMPAs > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-red-500 font-medium">MPA Conflicts</span>
                <span className="text-xs font-bold text-red-600">
                  {summary.conflictsWithMPAs}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Attribution */}
        <div className="border-t border-balean-gray-100 pt-2 mt-2">
          <span className="text-[9px] text-balean-gray-400">
            Data: EMODnet + OSPAR (CC0)
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact legend variant for tight spaces
export function WindFarmLegendCompact({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
      <i className="fi fi-rr-wind text-orange-500 text-xs" />
      <div className="flex gap-1">
        {(['Production', 'Under Construction', 'Planned'] as WindFarmStatus[]).map((status) => (
          <div
            key={status}
            className="w-3 h-2 rounded-sm"
            style={{ backgroundColor: WIND_FARM_STATUS_COLORS[status] }}
            title={WIND_FARM_STATUS_LABELS[status]}
          />
        ))}
      </div>
      <span className="text-[10px] text-balean-gray-500">Wind</span>
    </div>
  );
}
