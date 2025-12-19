/**
 * TrackingStatsCard Component
 * Displays statistics about tracked marine megafauna
 */

'use client';

import { motion } from 'framer-motion';
import type { MPATrackingSummary } from '@/types/obis-tracking';
import { Icon } from './ui';

interface TrackingStatsCardProps {
  summary: MPATrackingSummary;
}

export function TrackingStatsCard({ summary }: TrackingStatsCardProps) {
  // Calculate overall statistics
  const totalPoints = summary.paths.reduce((sum, path) => sum + path.points.length, 0);
  const avgResidency = summary.speciesBreakdown.length > 0
    ? summary.speciesBreakdown.reduce((sum, s) => sum + s.avgResidencyHours, 0) / summary.speciesBreakdown.length
    : 0;

  // Find species with most tracking data
  const topSpecies = summary.speciesBreakdown.slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ocean-primary/10 flex items-center justify-center">
          <Icon name="location-dot" size="md" className="text-ocean-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ocean-deep">
            Tracking & Movement Data
          </h3>
          <p className="text-sm text-gray-600">
            Satellite and acoustic tracking of marine megafauna
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="fish" size="sm" className="text-blue-600" />
            <p className="text-xs font-medium text-blue-900 uppercase tracking-wide">
              Individuals
            </p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {summary.trackedIndividuals}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="paw" size="sm" className="text-green-600" />
            <p className="text-xs font-medium text-green-900 uppercase tracking-wide">
              Species
            </p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {summary.species.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="location-pin" size="sm" className="text-purple-600" />
            <p className="text-xs font-medium text-purple-900 uppercase tracking-wide">
              Data Points
            </p>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {totalPoints.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="clock" size="sm" className="text-orange-600" />
            <p className="text-xs font-medium text-orange-900 uppercase tracking-wide">
              Avg Residency
            </p>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {avgResidency.toFixed(0)}
            <span className="text-sm font-normal ml-1">hrs</span>
          </p>
        </motion.div>
      </div>

      {/* Top Tracked Species */}
      {topSpecies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="trophy" size="sm" className="text-yellow-600" />
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Most Tracked Species
            </h4>
          </div>

          <div className="space-y-2">
            {topSpecies.map((species, index) => {
              const percentage = (species.count / summary.trackedIndividuals) * 100;

              return (
                <motion.div
                  key={species.scientificName}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {species.commonName}
                      </p>
                      <p className="text-xs text-gray-600 italic">
                        {species.scientificName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ocean-primary">
                        {species.count}
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Icon name="clock" size="sm" className="text-gray-400" />
                    <span>
                      Avg residency: {species.avgResidencyHours.toFixed(1)} hours
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-ocean-primary to-ocean-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: 0.7 + index * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Quality Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Icon name="calendar" size="sm" className="text-gray-400" />
            <span>
              {new Date(summary.dataQuality.dateRange.start).toLocaleDateString()} -{' '}
              {new Date(summary.dataQuality.dateRange.end).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Icon name="database" size="sm" className="text-gray-400" />
            <span>{summary.dataQuality.trackingRecords} records</span>
          </div>
        </div>
      </div>
    </div>
  );
}
