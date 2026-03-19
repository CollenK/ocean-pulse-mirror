'use client';

import { Icon, InfoTip } from '@/components/ui';
import { LitterBySourceChart, LitterByMaterialChart, LitterTrendChart } from '@/components/Charts/LitterCharts';
import { SOURCE_CONFIG, MATERIAL_CONFIG } from '@/types/marine-litter';
import type { LitterAnalytics } from '@/lib/litter-analytics-service';

interface MPALitterSectionProps {
  litterLoading: boolean;
  litterAnalytics: LitterAnalytics | null;
}

function getDensityColors(value: number) {
  if (value <= 20) return { bg: 'bg-green-50', text: 'text-green-700' };
  if (value <= 100) return { bg: 'bg-amber-50', text: 'text-amber-700' };
  return { bg: 'bg-red-50', text: 'text-red-700' };
}

function LitterSummaryStats({ analytics }: { analytics: LitterAnalytics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-teal-50 rounded-xl p-3 text-center">
        <p className="text-2xl font-bold text-teal-700">{analytics.totalReports}</p>
        <p className="text-xs text-balean-gray-400">Report{analytics.totalReports !== 1 ? 's' : ''}</p>
      </div>
      <div className="bg-teal-50 rounded-xl p-3 text-center">
        <p className="text-2xl font-bold text-teal-700">{analytics.totalItems >= 1000 ? `${(analytics.totalItems / 1000).toFixed(1)}K` : analytics.totalItems}</p>
        <p className="text-xs text-balean-gray-400">Items Found</p>
      </div>
      {analytics.averageItemsPer100m !== null && (() => { const c = getDensityColors(analytics.averageItemsPer100m); return (
        <div className={`rounded-xl p-3 text-center ${c.bg}`}>
          <p className={`text-2xl font-bold ${c.text}`}>{analytics.averageItemsPer100m}</p>
          <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">Items/100m<InfoTip text="Average litter density per 100 metres of beach, calculated from OSPAR-standard surveys. The EU MSFD Descriptor 10 considers fewer than 20 items/100m as 'clean'." /></p>
        </div>
      ); })()}
      {analytics.totalWeightKg !== null && (
        <div className="bg-teal-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-teal-700">{analytics.totalWeightKg} kg</p>
          <p className="text-xs text-balean-gray-400">Weight Collected</p>
        </div>
      )}
    </div>
  );
}

function LitterTopItems({ items, totalItems }: { items: LitterAnalytics['topItems']; totalItems: number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
      <h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2"><i className="fi fi-rr-list text-teal-500" />Most Common Items</h4>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => {
          const config = MATERIAL_CONFIG[item.material];
          const pct = totalItems > 0 ? (item.count / totalItems) * 100 : 0;
          return (
            <div key={item.code} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config?.bg || 'bg-gray-200'}`} />
              <span className="text-sm text-gray-800 flex-1 truncate">{item.name}</span>
              <span className="text-sm font-semibold text-gray-900">{item.count}</span>
              <span className="text-xs text-gray-400 w-10 text-right">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MPALitterSection({ litterLoading, litterAnalytics }: MPALitterSectionProps) {
  if (litterLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-teal-500 mb-4" />
        <p className="text-balean-gray-500 mb-2">Analyzing litter data...</p>
        <p className="text-sm text-balean-gray-400">Aggregating community litter reports</p>
      </div>
    );
  }

  if (!litterAnalytics || litterAnalytics.totalReports <= 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-teal-50 mx-auto mb-4 flex items-center justify-center"><i className="fi fi-rr-trash text-teal-300 text-3xl" /></div>
        <p className="text-balean-gray-500 mb-2 font-medium">No litter data yet</p>
        <p className="text-sm text-balean-gray-400 max-w-md mx-auto">Be the first to submit a marine litter report for this MPA. Your data helps track pollution and inform policy.</p>
      </div>
    );
  }

  return (
    <>
      <LitterSummaryStats analytics={litterAnalytics} />
      {(litterAnalytics.sourceBreakdown.length > 0 || litterAnalytics.materialBreakdown.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {litterAnalytics.sourceBreakdown.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-balean-navy mb-1 flex items-center gap-2"><i className="fi fi-rr-chart-pie text-teal-500" />Source Attribution</h4>
              <p className="text-xs text-balean-gray-400 mb-3">Where the litter likely comes from</p>
              <LitterBySourceChart data={litterAnalytics.sourceBreakdown} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {litterAnalytics.sourceBreakdown.slice(0, 5).map(s => (
                  <div key={s.source} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <i className={`fi fi-rr-${SOURCE_CONFIG[s.source]?.icon || 'question'} text-[10px]`} />
                    <span>{SOURCE_CONFIG[s.source]?.label || s.source}</span>
                    <span className="text-gray-400">({Math.round(s.percentage)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {litterAnalytics.materialBreakdown.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-balean-navy mb-1 flex items-center gap-2"><i className="fi fi-rr-layers text-teal-500" />Material Breakdown</h4>
              <p className="text-xs text-balean-gray-400 mb-3">Composition by material type</p>
              <LitterByMaterialChart data={litterAnalytics.materialBreakdown} />
            </div>
          )}
        </div>
      )}
      {litterAnalytics.monthlyTrend.length >= 2 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2"><i className="fi fi-rr-chart-line-up text-teal-500" />Litter Trend Over Time</h4>
          <LitterTrendChart data={litterAnalytics.monthlyTrend} />
        </div>
      )}
      {litterAnalytics.topItems.length > 0 && <LitterTopItems items={litterAnalytics.topItems} totalItems={litterAnalytics.totalItems} />}
      <div className="p-3 bg-balean-gray-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Icon name="info" size="sm" className="text-balean-gray-400 mt-0.5" />
          <div className="text-xs text-balean-gray-400">
            <p>Data from <strong>community litter reports</strong> submitted through Ocean PULSE</p>
            <p className="mt-1">Survey methodology aligned with OSPAR Beach Litter Monitoring Guidelines and EU Marine Strategy Framework Directive (MSFD) Descriptor 10.</p>
          </div>
        </div>
      </div>
    </>
  );
}
