'use client';

/**
 * FishingPressureLegend Component
 *
 * Displays a legend for the fishing pressure heatmap layer,
 * explaining the color gradient and fishing effort units.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface FishingPressureLegendProps {
  visible: boolean;
  totalFishingHours?: number;
  totalVessels?: number;
  dateRange?: { start: string; end: string };
}

export function FishingPressureLegend({
  visible,
  totalFishingHours,
  totalVessels,
  dateRange,
}: FishingPressureLegendProps) {
  if (!visible) return null;

  // Format fishing hours for display
  const formatHours = (hours: number): string => {
    if (hours >= 1000000) return `${(hours / 1000000).toFixed(1)}M`;
    if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K`;
    return hours.toFixed(0);
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
          <i className="fi fi-rr-ship text-balean-cyan text-sm" />
          <span className="text-xs font-semibold text-balean-navy">Fishing Pressure</span>
        </div>

        {/* Color gradient */}
        <div className="mb-2">
          <div
            className="h-3 w-full rounded-sm"
            style={{
              background: 'linear-gradient(to right, #2166ac, #67a9cf, #d1e5f0, #fddbc7, #ef8a62, #b2182b)',
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-balean-gray-500">Low</span>
            <span className="text-[10px] text-balean-gray-500">High</span>
          </div>
        </div>

        {/* Stats */}
        {(totalFishingHours !== undefined || totalVessels !== undefined) && (
          <div className="border-t border-balean-gray-100 pt-2 mt-2 space-y-1">
            {totalFishingHours !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-balean-gray-500">Total Hours</span>
                <span className="text-xs font-medium text-balean-navy">
                  {formatHours(totalFishingHours)}
                </span>
              </div>
            )}
            {totalVessels !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-balean-gray-500">Vessels</span>
                <span className="text-xs font-medium text-balean-navy">
                  {totalVessels.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Date range */}
        {dateRange && (
          <div className="border-t border-balean-gray-100 pt-2 mt-2">
            <span className="text-[10px] text-balean-gray-400">
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </span>
          </div>
        )}

        {/* Attribution */}
        <div className="border-t border-balean-gray-100 pt-2 mt-2">
          <span className="text-[9px] text-balean-gray-400">
            Data: Global Fishing Watch
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact legend for mobile
export function FishingPressureLegendCompact({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
      <i className="fi fi-rr-ship text-balean-cyan text-xs" />
      <div
        className="h-2 w-16 rounded-sm"
        style={{
          background: 'linear-gradient(to right, #2166ac, #fddbc7, #b2182b)',
        }}
      />
      <span className="text-[10px] text-balean-gray-500">Fishing</span>
    </div>
  );
}
