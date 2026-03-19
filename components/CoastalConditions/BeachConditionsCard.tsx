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

function getWaterQualityIconColor(level: CoastalConditions['waterQuality']['level']) {
  switch (level) {
    case 'good': return 'text-green-600';
    case 'moderate': return 'text-amber-600';
    case 'poor': return 'text-red-600';
  }
}

function getWaterQualityLabel(level: CoastalConditions['waterQuality']['level']) {
  switch (level) {
    case 'good': return 'Good';
    case 'moderate': return 'Moderate';
    case 'poor': return 'Poor';
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

function getSwimSafetySubValue(safety: CoastalConditions['swimSafety']) {
  switch (safety) {
    case 'safe': return 'Safe to swim';
    case 'caution': return 'Use caution';
    case 'dangerous': return 'Dangerous';
  }
}

interface SafetyBannerProps {
  variant: 'danger' | 'caution' | 'uv';
  title: string;
  description: string;
  icon: string;
}

function SafetyBanner({ variant, title, description, icon }: SafetyBannerProps) {
  const colorMap = {
    danger: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', titleColor: 'text-red-800', descColor: 'text-red-600' },
    caution: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', titleColor: 'text-amber-800', descColor: 'text-amber-600' },
    uv: { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', titleColor: 'text-orange-800', descColor: 'text-orange-600' },
  };
  const c = colorMap[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 p-3 rounded-xl ${c.bg} border ${c.border}`}
    >
      <div className={`w-8 h-8 rounded-full ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon name={icon} size="sm" className={c.iconColor} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${c.titleColor}`}>{title}</p>
        <p className={`text-xs ${c.descColor}`}>{description}</p>
      </div>
    </motion.div>
  );
}

function WaterQualityAdvisory({ waterQuality }: { waterQuality: CoastalConditions['waterQuality'] }) {
  return (
    <div className={`p-3 rounded-xl border-l-4 ${getWaterQualityBorderColor(waterQuality.level)} ${getWaterQualityBgColor(waterQuality.level)}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon name="droplet" size="sm" className={getWaterQualityIconColor(waterQuality.level)} />
        <span className="text-sm font-semibold text-gray-800">
          Water Quality: {getWaterQualityLabel(waterQuality.level)}
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
  );
}

export function BeachConditionsCard({
  conditions,
  isStale,
  onRefresh,
}: BeachConditionsCardProps) {
  const {
    airTemp, weatherDescription, windSpeed, windDirectionLabel,
    uvIndex, uvRiskLevel, waterTemp, waveHeight,
    swimSafety, swimSafetyReason, waterQuality, visibility, lastUpdated,
  } = conditions;

  const windDesc = getWindDescription(windSpeed);
  const weatherSummary = [weatherDescription, `${Math.round(airTemp)}°C`, `with ${windDesc} winds from the ${windDirectionLabel.toLowerCase()}`].join(', ');

  return (
    <div className="space-y-4">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-600 leading-relaxed">
        {weatherSummary}
      </motion.p>

      {swimSafety === 'dangerous' && (
        <SafetyBanner variant="danger" icon="exclamation" title="Swimming not recommended" description={swimSafetyReason} />
      )}
      {swimSafety === 'caution' && (
        <SafetyBanner variant="caution" icon="exclamation" title="Swim with caution" description={swimSafetyReason} />
      )}
      {(uvRiskLevel === 'very-high' || uvRiskLevel === 'extreme') && (
        <SafetyBanner variant="uv" icon="sun" title={uvRiskLevel === 'extreme' ? 'Extreme UV' : 'Very high UV'} description={UV_THRESHOLDS[uvRiskLevel].advice} />
      )}

      <div className="grid grid-cols-2 gap-3">
        <ConditionMetricCard icon="temperature-half" label="Air Temp" value={`${Math.round(airTemp)}°C`} subValue={`Feels like ${Math.round(conditions.feelsLike)}°C`} status="neutral" />
        <ConditionMetricCard icon="water" label="Water Temp" value={waterTemp !== null ? `${Math.round(waterTemp)}°C` : 'N/A'} status="neutral" />
        <ConditionMetricCard icon="waves" label="Wave Height" value={waveHeight !== null ? `${waveHeight.toFixed(1)}m` : 'N/A'} subValue={getSwimSafetySubValue(swimSafety)} status={getSwimSafetyColor(swimSafety)} />
        <ConditionMetricCard icon="sun" label="UV Index" value={uvIndex.toFixed(0)} subValue={uvRiskLevel.replace('-', ' ')} status={getUVStatusColor(uvRiskLevel)} />
        <ConditionMetricCard icon="wind" label="Wind" value={`${Math.round(windSpeed)} km/h`} subValue={`From ${windDirectionLabel}`} status={windSpeed > 40 ? 'caution' : 'neutral'} />
        <ConditionMetricCard icon="eye" label="Visibility" value={visibility >= 10 ? `${Math.round(visibility)} km` : `${visibility.toFixed(1)} km`} status={visibility < 2 ? 'caution' : 'neutral'} />
      </div>

      <WaterQualityAdvisory waterQuality={waterQuality} />

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className={`flex items-center gap-1.5 text-xs ${isStale ? 'text-amber-600' : 'text-gray-400'}`}>
          <Icon name="clock" size="sm" />
          <span>Updated {formatMinutesAgo(lastUpdated)}</span>
          {isStale && <Badge variant="warning" size="sm">Stale</Badge>}
        </div>
        <button onClick={onRefresh} className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 transition-colors">
          <Icon name="refresh" size="sm" />
          Refresh
        </button>
      </div>
    </div>
  );
}
