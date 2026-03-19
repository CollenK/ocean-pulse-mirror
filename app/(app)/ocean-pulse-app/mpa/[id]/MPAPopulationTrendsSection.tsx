'use client';

import { motion } from 'framer-motion';
import { CollapsibleCard, Badge, Button, Icon } from '@/components/ui';
import { AbundanceTrendCard } from '@/components/AbundanceTrendCard';
import type { MPAAbundanceSummary } from '@/types/obis-abundance';

interface MPAPopulationTrendsSectionProps {
  abundanceLoading: boolean;
  abundanceProgress: number;
  abundanceSummary: MPAAbundanceSummary | null;
  showAllTrends: boolean;
  onToggleShowAll: () => void;
}

export function MPAPopulationTrendsSection({ abundanceLoading, abundanceProgress, abundanceSummary, showAllTrends, onToggleShowAll }: MPAPopulationTrendsSectionProps) {
  return (
    <CollapsibleCard
      title="Population Trends" icon="arrow-trend-up" iconColor="text-balean-coral" defaultOpen={false}
      badge={abundanceSummary && abundanceSummary.speciesTrends.length > 0 && (
        <Badge
          variant={abundanceSummary.overallBiodiversity.trendDirection === 'increasing' ? 'healthy' : abundanceSummary.overallBiodiversity.trendDirection === 'stable' ? 'info' : 'warning'}
          size="sm"
        >
          {abundanceSummary.overallBiodiversity.trendDirection}
        </Badge>
      )}
      className="mb-4"
    >
      {abundanceLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
          <p className="text-balean-gray-500 mb-2">Analyzing indicator species abundance data...</p>
          <p className="text-sm text-balean-gray-400 mb-4">Filtering for ecosystem-relevant indicator species</p>
          <div className="mt-4 w-full bg-balean-gray-200 rounded-full h-2 max-w-md mx-auto">
            <motion.div className="bg-gradient-to-r from-balean-cyan to-balean-cyan-light h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${abundanceProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      ) : abundanceSummary && abundanceSummary.speciesTrends.length > 0 ? (
        <>
          <div className="mb-6 p-4 bg-gradient-to-br from-balean-cyan/10 to-balean-cyan-light/10 rounded-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-balean-gray-500 mb-1">Estimated Species Health</p>
                <p className="text-3xl font-bold text-balean-navy">{abundanceSummary.overallBiodiversity.healthScore}<span className="text-lg text-balean-gray-400">/100</span></p>
                <p className="text-xs text-balean-gray-400 mt-1">Based on {abundanceSummary.speciesTrends.length} indicator species from available data</p>
              </div>
              <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                abundanceSummary.overallBiodiversity.trendDirection === 'increasing' ? 'bg-healthy/10 text-healthy' :
                abundanceSummary.overallBiodiversity.trendDirection === 'stable' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
              }`}>
                <Icon name={abundanceSummary.overallBiodiversity.trendDirection === 'increasing' ? 'arrow-trend-up' : abundanceSummary.overallBiodiversity.trendDirection === 'stable' ? 'minus' : 'arrow-trend-down'} />
                <span className="font-medium capitalize">{abundanceSummary.overallBiodiversity.trendDirection}</span>
              </div>
            </div>
          </div>
          <div className="mb-4 p-3 bg-healthy/10 border-l-4 border-healthy rounded">
            <div className="flex items-start gap-2">
              <Icon name="leaf" size="sm" className="text-healthy mt-0.5" />
              <div className="text-sm text-balean-gray-500">
                <p className="font-medium mb-1">Indicator Species Data</p>
                <p className="text-xs text-balean-gray-400">{abundanceSummary.dataQuality.recordsWithAbundance.toLocaleString()} occurrence records for indicator species from OBIS (10-year analysis)</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {abundanceSummary.speciesTrends.slice(0, showAllTrends ? undefined : 6).map((trend) => (
              <AbundanceTrendCard key={trend.scientificName} trend={trend} />
            ))}
          </div>
          {abundanceSummary.speciesTrends.length > 6 && (
            <Button fullWidth variant="secondary" onClick={onToggleShowAll}>
              <Icon name={showAllTrends ? 'angle-up' : 'angle-down'} size="sm" />
              {showAllTrends ? 'Show Less' : `View All ${abundanceSummary.speciesTrends.length} Trends`}
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="chart-line" className="text-balean-gray-300 text-3xl" />
          </div>
          <p className="text-balean-gray-500 mb-2 font-medium">No indicator species abundance data</p>
          <p className="text-sm text-balean-gray-400">No abundance records found for indicator species in this MPA</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
