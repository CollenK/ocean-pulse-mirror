'use client';

import { LITTER_INTENSITY_COLORS, LITTER_INTENSITY_LABELS } from '@/lib/emodnet-litter';

interface LitterHotspotLegendProps {
  visible: boolean;
  surveyCount?: number;
  className?: string;
}

const INTENSITY_ORDER = ['low', 'moderate', 'high', 'very_high'] as const;

export function LitterHotspotLegend({ visible, surveyCount, className }: LitterHotspotLegendProps) {
  if (!visible) return null;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-3 min-w-[180px] ${className || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <i className="fi fi-rr-trash text-teal-500 text-sm" />
        <span className="text-xs font-semibold text-balean-navy">Beach Litter Hotspots</span>
      </div>

      <div className="space-y-1 mb-2">
        {INTENSITY_ORDER.map((intensity) => (
          <div key={intensity} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: LITTER_INTENSITY_COLORS[intensity] }}
            />
            <span className="text-[10px] text-balean-gray-600">
              {LITTER_INTENSITY_LABELS[intensity]}
            </span>
          </div>
        ))}
      </div>

      {surveyCount !== undefined && (
        <div className="border-t border-balean-gray-100 pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-balean-gray-400">Survey sites</span>
            <span className="text-xs font-medium text-balean-navy">{surveyCount}</span>
          </div>
        </div>
      )}

      <div className="border-t border-balean-gray-100 pt-2 mt-2">
        <span className="text-[9px] text-balean-gray-400">
          Data: EMODnet Chemistry / OSPAR
        </span>
      </div>
    </div>
  );
}
