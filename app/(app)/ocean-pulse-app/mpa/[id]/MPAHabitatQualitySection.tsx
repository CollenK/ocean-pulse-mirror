'use client';

import { motion } from 'framer-motion';
import { CollapsibleCard, Badge, Icon } from '@/components/ui';
import { EnvironmentalDashboard } from '@/components/EnvironmentalDashboard';
import type { MPAEnvironmentalSummary } from '@/types/obis-environmental';

interface MPAHabitatQualitySectionProps {
  environmentalLoading: boolean;
  environmentalProgress: number;
  environmentalSummary: MPAEnvironmentalSummary | null;
}

export function MPAHabitatQualitySection({ environmentalLoading, environmentalProgress, environmentalSummary }: MPAHabitatQualitySectionProps) {
  return (
    <CollapsibleCard
      title="Habitat Quality" icon="flask" iconColor="text-balean-cyan" defaultOpen={false}
      badge={environmentalSummary && environmentalSummary.parameters.length > 0 && (
        <Badge variant={environmentalSummary.habitatQualityScore >= 80 ? 'healthy' : environmentalSummary.habitatQualityScore >= 60 ? 'info' : 'warning'} size="sm">
          {environmentalSummary.habitatQualityScore}/100
        </Badge>
      )}
      className="mb-4"
    >
      {environmentalLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-balean-gray-200 border-t-balean-cyan mb-4" />
          <p className="text-balean-gray-500 mb-2">Analyzing environmental conditions...</p>
          <p className="text-sm text-balean-gray-400 mb-4">Temperature, salinity, pH, and more</p>
          <div className="mt-4 w-full bg-balean-gray-200 rounded-full h-2 max-w-md mx-auto">
            <motion.div className="bg-gradient-to-r from-balean-cyan to-balean-cyan-light h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${environmentalProgress}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      ) : environmentalSummary && environmentalSummary.parameters.length > 0 ? (
        <>
          <div className="mb-6 p-4 bg-gradient-to-br from-balean-cyan/10 to-balean-cyan-light/10 rounded-xl border border-balean-cyan/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-balean-gray-500 mb-1">Estimated Habitat Quality</p>
                <p className="text-3xl font-bold text-balean-navy">{environmentalSummary.habitatQualityScore}<span className="text-lg text-balean-gray-400">/100</span></p>
                <p className="text-xs text-balean-gray-400 mt-1">Based on {environmentalSummary.parameters.length} environmental parameters</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center">
                <Icon
                  name={environmentalSummary.habitatQualityScore >= 80 ? 'circle-check' : environmentalSummary.habitatQualityScore >= 60 ? 'circle-exclamation' : 'triangle-exclamation'}
                  className={`text-3xl ${environmentalSummary.habitatQualityScore >= 80 ? 'text-healthy' : environmentalSummary.habitatQualityScore >= 60 ? 'text-warning' : 'text-critical'}`}
                />
              </div>
            </div>
          </div>
          <div className="mb-4 p-3 bg-info/10 border-l-4 border-info rounded">
            <div className="flex items-start gap-2">
              <Icon name="info" size="sm" className="text-info mt-0.5" />
              <div className="text-sm text-balean-gray-500">
                <p className="font-medium mb-1">Environmental Monitoring Data</p>
                <p className="text-xs text-balean-gray-400">{environmentalSummary.dataQuality.measurementsCount.toLocaleString()} measurements across {environmentalSummary.parameters.length} parameters from OBIS-ENV-DATA</p>
              </div>
            </div>
          </div>
          <EnvironmentalDashboard summary={environmentalSummary} />
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-balean-gray-100 mx-auto mb-4 flex items-center justify-center">
            <Icon name="flask" className="text-balean-gray-300 text-3xl" />
          </div>
          <p className="text-balean-gray-500 mb-2 font-medium">No environmental data available</p>
          <p className="text-sm text-balean-gray-400">This MPA may not have environmental measurements in the OBIS database yet</p>
        </div>
      )}
    </CollapsibleCard>
  );
}
