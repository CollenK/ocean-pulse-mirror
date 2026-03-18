'use client';

import { motion } from 'framer-motion';
import { Icon, Badge } from '@/components/ui';
import { ConditionMetricCard } from './ConditionMetricCard';
import type { CoastalConditions } from '@/types/coastal-conditions';
import { UV_THRESHOLDS } from '@/types/coastal-conditions';

interface BeachConditionsCardProps {
  conditions: CoastalConditions;
  isStale: boolean;
  onRefresh: () => void;
}

function getUVStatusColor(level: CoastalConditions['uvRiskLevel']) {
  switch (level) {
    case 'low': return 'good' as const;
    case 'moderate': return 'caution' as const;
    case 'high':
    case 'very-high':
    case 'extreme': return 'danger' as const;
  }
}

function getSwimSafetyColor(safety: CoastalConditions['swimSafety']) {
  switch (safety) {
    case 'safe': return 'good' as const;
    case 'caution': return 'caution' as const;
    case 'dangerous': return 'danger' as const;
  }
}

function getWaterQualityBorderColor(level: CoastalConditions['waterQuality']['level']) {
  switch (level) {
    case 'good': return 'border-green-300';
    case 'moderate': return 'border-amber-300';
    case 'poor': return 'border-red-300';
  }
}

function getWaterQualityBgColor(level: CoastalConditions['waterQuality']['level']) {
  switch (level) {
    case 'good': return 'bg-green-50';
    case 'moderate': return 'bg-amber-50';
    case 'poor': return 'bg-red-50';
  }
}

function formatMinutesAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  return `${hours} hours ago`;
}

function getWindDescription(speed: number): string {
  if (speed < 5) return 'calm';
  if (speed < 20) return 'light';
  if (speed < 40) return 'moderate';
  if (speed < 60) return 'strong';
  return 'very strong';
}

export function BeachConditionsCard({
  conditions,
  isStale,
  onRefresh,
}: BeachConditionsCardProps) {
  const {
    airTemp,
    weatherDescription,
    windSpeed,
    windDirectionLabel,
    uvIndex,
    uvRiskLevel,
    waterTemp,
    waveHeight,
    swimSafety,
    swimSafetyReason,
    waterQuality,
    visibility,
    lastUpdated,
  } = conditions;

  const windDesc = getWindDescription(windSpeed);

  // Build weather summary sentence
  const summaryParts = [
    weatherDescription,
    `${Math.round(airTemp)}°C`,
    `with ${windDesc} winds from the ${windDirectionLabel.toLowerCase()}`,
  ];
  const weatherSummary = summaryParts.join(', ');

  // Determine if safety advisory banner is needed
  const showDangerBanner = swimSafety === 'dangerous';
  const showUVWarning = uvRiskLevel === 'very-high' || uvRiskLevel === 'extreme';
  const showCautionBanner = swimSafety === 'caution' && !showDangerBanner;

  return (
    <div className="space-y-4">
      {/* Weather Summary */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-600 leading-relaxed"
      >
        {weatherSummary}
      </motion.p>

      {/* Safety Advisory Banners */}
      {showDangerBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200"
        >
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Icon name="exclamation" size="sm" className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">Swimming not recommended</p>
            <p className="text-xs text-red-600">{swimSafetyReason}</p>
          </div>
        </motion.div>
      )}

      {showCautionBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Icon name="exclamation" size="sm" className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Swim with caution</p>
            <p className="text-xs text-amber-600">{swimSafetyReason}</p>
          </div>
        </motion.div>
      )}

      {showUVWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200"
        >
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Icon name="sun" size="sm" className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {uvRiskLevel === 'extreme' ? 'Extreme UV' : 'Very high UV'}
            </p>
            <p className="text-xs text-orange-600">
              {UV_THRESHOLDS[uvRiskLevel].advice}
            </p>
          </div>
        </motion.div>
      )}

      {/* Quick Glance Grid - 2x3 */}
      <div className="grid grid-cols-2 gap-3">
        <ConditionMetricCard
          icon="temperature-half"
          label="Air Temp"
          value={`${Math.round(airTemp)}°C`}
          subValue={`Feels like ${Math.round(conditions.feelsLike)}°C`}
          status="neutral"
        />

        <ConditionMetricCard
          icon="water"
          label="Water Temp"
          value={waterTemp !== null ? `${Math.round(waterTemp)}°C` : 'N/A'}
          status="neutral"
        />

        <ConditionMetricCard
          icon="waves"
          label="Wave Height"
          value={waveHeight !== null ? `${waveHeight.toFixed(1)}m` : 'N/A'}
          subValue={swimSafety === 'safe' ? 'Safe to swim' : swimSafety === 'caution' ? 'Use caution' : 'Dangerous'}
          status={getSwimSafetyColor(swimSafety)}
        />

        <ConditionMetricCard
          icon="sun"
          label="UV Index"
          value={uvIndex.toFixed(0)}
          subValue={uvRiskLevel.replace('-', ' ')}
          status={getUVStatusColor(uvRiskLevel)}
        />

        <ConditionMetricCard
          icon="wind"
          label="Wind"
          value={`${Math.round(windSpeed)} km/h`}
          subValue={`From ${windDirectionLabel}`}
          status={windSpeed > 40 ? 'caution' : 'neutral'}
        />

        <ConditionMetricCard
          icon="eye"
          label="Visibility"
          value={visibility >= 10 ? `${Math.round(visibility)} km` : `${visibility.toFixed(1)} km`}
          status={visibility < 2 ? 'caution' : 'neutral'}
        />
      </div>

      {/* Water Quality Advisory */}
      <div className={`p-3 rounded-xl border-l-4 ${getWaterQualityBorderColor(waterQuality.level)} ${getWaterQualityBgColor(waterQuality.level)}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon name="droplet" size="sm" className={
            waterQuality.level === 'good' ? 'text-green-600' :
            waterQuality.level === 'moderate' ? 'text-amber-600' : 'text-red-600'
          } />
          <span className="text-sm font-semibold text-gray-800">
            Water Quality: {waterQuality.level === 'good' ? 'Good' : waterQuality.level === 'moderate' ? 'Moderate' : 'Poor'}
          </span>
        </div>
        <p className="text-xs text-gray-600 mb-2">{waterQuality.message}</p>
        {waterQuality.factors.length > 0 && (
          <ul className="space-y-1">
            {waterQuality.factors.map((factor, i) => (
              <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                <Icon name="circle" size="sm" className="text-gray-300 mt-0.5 flex-shrink-0 text-[6px]" />
                {factor}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-gray-400 mt-2 italic">
          Estimated from weather conditions, not direct water testing
        </p>
      </div>

      {/* Staleness Indicator */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className={`flex items-center gap-1.5 text-xs ${isStale ? 'text-amber-600' : 'text-gray-400'}`}>
          <Icon name="clock" size="sm" />
          <span>Updated {formatMinutesAgo(lastUpdated)}</span>
          {isStale && (
            <Badge variant="warning" size="sm">Stale</Badge>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          <Icon name="refresh" size="sm" />
          Refresh
        </button>
      </div>
    </div>
  );
}
