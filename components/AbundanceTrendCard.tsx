/**
 * AbundanceTrendCard Component
 * Displays species abundance trends with sparkline visualization
 */

'use client';

import { motion } from 'framer-motion';
import { AbundanceTrend } from '@/types/obis-abundance';
import { Icon } from './ui';

interface AbundanceTrendCardProps {
  trend: AbundanceTrend;
}

export function AbundanceTrendCard({ trend }: AbundanceTrendCardProps) {
  const trendColors = {
    increasing: 'from-green-400 to-emerald-500',
    stable: 'from-blue-400 to-cyan-500',
    decreasing: 'from-orange-400 to-red-500',
    insufficient_data: 'from-gray-300 to-gray-400',
  };

  const trendIcons = {
    increasing: 'arrow-trend-up',
    stable: 'minus',
    decreasing: 'arrow-trend-down',
    insufficient_data: 'question',
  };

  const trendLabels = {
    increasing: 'Est. Increasing',
    stable: 'Est. Stable',
    decreasing: 'Est. Decreasing',
    insufficient_data: 'Insufficient Data',
  };

  // Calculate min/max for chart normalization
  const maxCount = Math.max(...trend.dataPoints.map(d => d.count));
  const minCount = Math.min(...trend.dataPoints.map(d => d.count));
  const range = maxCount - minCount || 1; // Avoid division by zero

  // Generate SVG path points
  const chartPoints = trend.dataPoints.map((d, i) => {
    const x = (i / (trend.dataPoints.length - 1)) * 100;
    const y = 100 - ((d.count - minCount) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-card border border-gray-200 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-ocean-deep text-sm">
            {trend.speciesName}
          </h3>
          {trend.speciesName !== trend.scientificName && (
            <p className="text-xs text-gray-500 italic mt-1">
              {trend.scientificName}
            </p>
          )}
        </div>

        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${trendColors[trend.trend]} flex items-center justify-center flex-shrink-0`}>
          <Icon name={trendIcons[trend.trend]} className="text-white" />
        </div>
      </div>

      {/* Mini Sparkline Chart */}
      {trend.dataPoints.length > 1 ? (
        <div className="h-16 mb-3 relative">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.5" />

            {/* Area fill */}
            <motion.polygon
              points={`0,100 ${chartPoints} 100,100`}
              fill="url(#gradient-fill)"
              opacity="0.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ duration: 1, delay: 0.3 }}
            />

            {/* Trend line */}
            <motion.polyline
              points={chartPoints}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />

            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="gradient-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ) : (
        <div className="h-16 mb-3 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-xs text-gray-400">Insufficient data points</p>
        </div>
      )}

      {/* Trend Summary */}
      <div className="flex items-center justify-between text-xs mb-3">
        <div>
          <span className="text-gray-500">Change: </span>
          <span className={`font-semibold ${
            trend.changePercent > 0 ? 'text-green-600' :
            trend.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-gray-500">Confidence:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            trend.confidence === 'high' ? 'bg-green-100 text-green-700' :
            trend.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend.confidence}
          </span>
        </div>
      </div>

      {/* Data Points Count */}
      <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Icon name="chart-simple" size="sm" className="text-gray-400" />
          <span>
            {trend.dataPoints.length} data point{trend.dataPoints.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Icon name="calendar" size="sm" className="text-gray-400" />
          <span>
            {Math.floor(trend.dataPoints.length / 12)} year{Math.floor(trend.dataPoints.length / 12) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Data note */}
      <p className="text-[10px] text-gray-400 mt-2">Trend based on available occurrence records</p>

      {/* Status Badge */}
      <div className="mt-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          trend.trend === 'increasing' ? 'bg-green-50 text-green-700' :
          trend.trend === 'stable' ? 'bg-blue-50 text-blue-700' :
          trend.trend === 'decreasing' ? 'bg-orange-50 text-orange-700' :
          'bg-gray-50 text-gray-600'
        }`}>
          <Icon name={trendIcons[trend.trend]} size="sm" />
          {trendLabels[trend.trend]}
        </span>
      </div>
    </motion.div>
  );
}
