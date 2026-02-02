/**
 * EnvironmentalMetricCard Component
 * Displays individual environmental parameter with gauge visualization
 */

'use client';

import { motion } from 'framer-motion';
import { EnvironmentalParameter } from '@/types/obis-environmental';
import { Icon } from './ui';

interface EnvironmentalMetricCardProps {
  parameter: EnvironmentalParameter;
}

export function EnvironmentalMetricCard({ parameter }: EnvironmentalMetricCardProps) {
  const getStatusColor = () => {
    if (!parameter.threshold) return 'bg-gray-100 text-gray-700 border-gray-200';

    switch (parameter.threshold.status) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-300';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-green-100 text-green-700 border-green-300';
    }
  };

  const getTrendIcon = () => {
    switch (parameter.trend) {
      case 'increasing': return 'arrow-trend-up';
      case 'decreasing': return 'arrow-trend-down';
      default: return 'minus';
    }
  };

  const getTrendColor = () => {
    switch (parameter.trend) {
      case 'increasing': return 'text-green-600';
      case 'decreasing': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getParameterIcon = () => {
    switch (parameter.type) {
      case 'temperature': return 'temperature-half';
      case 'salinity': return 'droplet';
      case 'depth': return 'water';
      case 'pH': return 'flask';
      case 'oxygen': return 'wind';
      case 'chlorophyll': return 'leaf';
      default: return 'chart-line';
    }
  };

  // Calculate percentage for gauge
  const percentOfRange = parameter.max !== parameter.min
    ? ((parameter.currentValue - parameter.min) / (parameter.max - parameter.min)) * 100
    : 50;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl p-4 shadow-card border border-gray-200 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ocean-primary/10 flex items-center justify-center">
            <Icon name={getParameterIcon()} size="sm" className="text-ocean-primary" />
          </div>
          <h3 className="text-sm font-semibold text-ocean-deep">
            {parameter.name}
          </h3>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          {parameter.threshold?.status === 'critical' ? 'critical' :
           parameter.threshold?.status === 'warning' ? 'warning' :
           'within range'}
        </span>
      </div>

      {/* Current Value - Large Display */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-ocean-deep">
          {parameter.currentValue.toFixed(1)}
          <span className="text-sm text-gray-500 ml-2">{parameter.unit}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <Icon name="chart-simple" size="sm" className="text-gray-400" />
          <span>Avg: {parameter.historicalAvg.toFixed(1)} {parameter.unit}</span>
        </div>
      </div>

      {/* Gauge Visualization */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <motion.div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-ocean-primary to-ocean-accent"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, percentOfRange))}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      {/* Min/Max Range */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{parameter.min.toFixed(1)}</span>
        <span>{parameter.max.toFixed(1)}</span>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Icon name="calendar" size="sm" className="text-gray-400" />
          <span>{parameter.dataPoints.length} months</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
          <Icon name={getTrendIcon()} size="sm" />
          <span className="capitalize">Est. {parameter.trend}</span>
        </div>
      </div>

      {/* Data note */}
      <p className="text-[10px] text-gray-400 mt-2">Based on available monitoring data</p>

      {/* Threshold Warning */}
      {parameter.threshold && parameter.threshold.status !== 'normal' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded text-xs"
        >
          <div className="flex items-start gap-2">
            <Icon name="triangle-exclamation" size="sm" className="text-yellow-600 mt-0.5" />
            <p className="text-gray-700">
              {parameter.threshold.status === 'critical'
                ? 'Value appears outside typical range based on available data'
                : 'Value may be approaching threshold based on available data'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
