'use client';

import { Icon, InfoTip } from '@/components/ui';
import { FishingTrendChart, FishingByFlagChart, FishingByGearChart } from '@/components/Charts/FishingTrendChart';
import { VesselActivityFeed } from '@/components/VesselActivity';
import type { GFWFishingEffortSummary, GFWVesselActivity, GFWComplianceScore, GFWIUURiskAssessment } from '@/types/gfw';

interface MPAFishingSectionProps {
  fishingLoading: boolean;
  fishingError: Error | null;
  fishingEffort: GFWFishingEffortSummary | null;
  vesselActivity: GFWVesselActivity[];
  complianceScore: GFWComplianceScore | null;
  iuuRisk: GFWIUURiskAssessment | null;
  protectionLevel: string;
}

function getScoreColors(score: number) {
  if (score >= 80) return { bg: 'bg-green-50', text: 'text-green-700' };
  if (score >= 60) return { bg: 'bg-amber-50', text: 'text-amber-700' };
  return { bg: 'bg-red-50', text: 'text-red-700' };
}

function getRiskColors(level: string) {
  const map: Record<string, { bg: string; text: string }> = {
    low: { bg: 'bg-green-50', text: 'text-green-700' },
    moderate: { bg: 'bg-amber-50', text: 'text-amber-700' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700' },
  };
  return map[level] || { bg: 'bg-red-50', text: 'text-red-700' };
}

function getFishingErrorMessage(error: Error): string {
  if (error.message.includes('not configured')) return 'Global Fishing Watch API is not configured. Contact the administrator to enable this feature.';
  if (error.message.includes('authentication') || error.message.includes('401')) return 'Global Fishing Watch API token may be expired or invalid.';
  return 'Unable to fetch fishing data. The API may be temporarily unavailable.';
}

function FishingSummaryCards({ fishingEffort, complianceScore, iuuRisk, protectionLevel }: Pick<MPAFishingSectionProps, 'fishingEffort' | 'complianceScore' | 'iuuRisk' | 'protectionLevel'>) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {fishingEffort && (
        <>
          <div className="bg-balean-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-balean-navy">{fishingEffort.totalFishingHours >= 1000 ? `${(fishingEffort.totalFishingHours / 1000).toFixed(1)}K` : Math.round(fishingEffort.totalFishingHours)}</p>
            <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">Fishing Hours<InfoTip text="Total hours of detected fishing activity within this MPA over the past 12 months. Data from Global Fishing Watch using AIS (Automatic Identification System) vessel tracking. AIS coverage may vary; some vessels disable transponders or operate without AIS." /></p>
          </div>
          <div className="bg-balean-gray-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-balean-navy">{fishingEffort.totalVessels}</p>
            <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">Vessels<InfoTip text="Unique fishing vessels detected in this MPA over the past 12 months. Identified by their AIS transponders via Global Fishing Watch satellite tracking. Small-scale or artisanal vessels without AIS may not be counted." /></p>
          </div>
        </>
      )}
      {complianceScore && (() => { const c = getScoreColors(complianceScore.score); return (
        <div className={`rounded-xl p-3 text-center ${c.bg}`}>
          <p className={`text-2xl font-bold ${c.text}`}>{complianceScore.score}</p>
          <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">Compliance<InfoTip text={`Estimated compliance score (0-100) based on fishing activity relative to this MPA's protection level (${protectionLevel}). Higher scores indicate less fishing activity. For no-take zones, any fishing reduces the score. This is a simplified estimate; actual compliance depends on specific regulations and permitted activities.`} /></p>
        </div>
      ); })()}
      {iuuRisk && (() => { const r = getRiskColors(iuuRisk.riskLevel); return (
        <div className={`rounded-xl p-3 text-center ${r.bg}`}>
          <p className={`text-2xl font-bold capitalize ${r.text}`}>{iuuRisk.riskLevel}</p>
          <p className="text-xs text-balean-gray-400 flex items-center justify-center gap-1">IUU Risk<InfoTip text="Illegal, Unreported, and Unregulated (IUU) fishing risk estimate based on fishing intensity and vessel diversity patterns. Factors include: total fishing hours, number of flag states present, and vessel count. This is an indicative assessment; confirmed IUU activity requires investigation by authorities." /></p>
        </div>
      ); })()}
    </div>
  );
}

function FishingBreakdownCharts({ effort }: { effort: GFWFishingEffortSummary }) {
  const hasFlag = effort.byFlag && effort.byFlag.length > 0;
  const hasGear = effort.byGearType && effort.byGearType.length > 0;
  if (!hasFlag && !hasGear) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {hasFlag && (<div className="bg-white rounded-xl p-4 shadow-sm"><h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2"><Icon name="flag" size="sm" className="text-balean-cyan" />By Flag State</h4><FishingByFlagChart data={effort.byFlag} /></div>)}
      {hasGear && (<div className="bg-white rounded-xl p-4 shadow-sm"><h4 className="font-semibold text-balean-navy mb-3 flex items-center gap-2"><Icon name="anchor" size="sm" className="text-balean-coral" />By Gear Type</h4><FishingByGearChart data={effort.byGearType} /></div>)}
    </div>
  );
}

function GFWAttribution() {
  return (
    <div className="p-3 bg-balean-gray-50 rounded-lg">
      <div className="flex items-start gap-2">
        <Icon name="info" size="sm" className="text-balean-gray-400 mt-0.5" />
        <div className="text-xs text-balean-gray-400">
          <p>Data from <strong>Global Fishing Watch</strong> (globalfishingwatch.org)</p>
          <p className="mt-1">Global Fishing Watch uses satellite data to track commercial fishing activity worldwide.</p>
        </div>
      </div>
    </div>
  );
}

function hasAnyFishingData(props: MPAFishingSectionProps): boolean {
  return !!(props.fishingEffort || (props.vesselActivity && props.vesselActivity.length > 0) || props.complianceScore || props.iuuRisk);
}

export function MPAFishingSection(props: MPAFishingSectionProps) {
  const { fishingLoading, fishingError, fishingEffort, vesselActivity, complianceScore, iuuRisk, protectionLevel } = props;

  if (fishingLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
        <p className="text-balean-gray-500 mb-2">Analyzing fishing activity...</p>
        <p className="text-sm text-balean-gray-400">Data from Global Fishing Watch</p>
      </div>
    );
  }

  if (fishingError) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto mb-4 flex items-center justify-center"><Icon name="info" className="text-amber-500 text-3xl" /></div>
        <p className="text-balean-gray-500 mb-2 font-medium">Fishing data unavailable</p>
        <p className="text-sm text-balean-gray-400 max-w-md mx-auto">{getFishingErrorMessage(fishingError)}</p>
        <p className="text-xs text-balean-gray-300 mt-2">Error: {fishingError.message}</p>
      </div>
    );
  }

  if (!hasAnyFishingData(props)) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center"><Icon name="ship" className="text-balean-gray-300 text-3xl" /></div>
        <p className="text-balean-gray-500 mb-2 font-medium">No fishing activity data</p>
        <p className="text-sm text-balean-gray-400">Global Fishing Watch data is not available for this MPA</p>
      </div>
    );
  }

  return (
    <>
      <FishingSummaryCards fishingEffort={fishingEffort} complianceScore={complianceScore} iuuRisk={iuuRisk} protectionLevel={protectionLevel} />
      {fishingEffort && <div className="mb-6"><FishingTrendChart data={fishingEffort} /></div>}
      {fishingEffort && <FishingBreakdownCharts effort={fishingEffort} />}
      {vesselActivity && vesselActivity.length > 0 && <div className="mb-4"><VesselActivityFeed events={vesselActivity} maxItems={10} /></div>}
      <GFWAttribution />
    </>
  );
}
