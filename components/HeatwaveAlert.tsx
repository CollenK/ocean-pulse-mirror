'use client';

import { motion } from 'framer-motion';
import { MarineHeatwaveAlert, HeatwaveCategory } from '@/hooks/useHeatwaveAlert';
import { Icon, InfoTip } from './ui';

interface HeatwaveAlertProps {
  alert: MarineHeatwaveAlert;
  className?: string;
}

const categoryConfig: Record<HeatwaveCategory, {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  icon: string;
}> = {
  none: {
    label: 'No Heatwave',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    icon: 'check-circle',
  },
  moderate: {
    label: 'Category I - Moderate',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    icon: 'exclamation-triangle',
  },
  strong: {
    label: 'Category II - Strong',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-600',
    icon: 'exclamation-triangle',
  },
  severe: {
    label: 'Category III - Severe',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    icon: 'exclamation-circle',
  },
  extreme: {
    label: 'Category IV - Extreme',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    textColor: 'text-red-900',
    iconColor: 'text-red-700',
    icon: 'fire-flame-curved',
  },
};

export function HeatwaveAlert({ alert, className = '' }: HeatwaveAlertProps) {
  const config = categoryConfig[alert.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${config.bgColor} ${config.borderColor} overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className={`fi fi-rr-${config.icon} ${config.iconColor}`} />
            <h3 className={`font-semibold ${config.textColor}`}>
              Marine Heatwave Status
            </h3>
            <InfoTip
              text="Marine heatwaves are prolonged periods of anomalously warm ocean temperatures. Classification follows Hobday et al. 2018, based on how much the current SST exceeds the 90th percentile threshold for this location and time of year."
            />
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Temperature metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Current SST</p>
            <p className={`text-lg font-bold ${alert.active ? config.textColor : 'text-gray-700'}`}>
              {alert.current_sst !== null ? `${alert.current_sst}°C` : '--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Expected</p>
            <p className="text-lg font-bold text-gray-700">
              {alert.climatological_mean !== null ? `${alert.climatological_mean}°C` : '--'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Anomaly</p>
            <p className={`text-lg font-bold ${alert.anomaly && alert.anomaly > 0 ? 'text-red-600' : 'text-gray-700'}`}>
              {alert.anomaly !== null ? `${alert.anomaly > 0 ? '+' : ''}${alert.anomaly}°C` : '--'}
            </p>
          </div>
        </div>

        {/* Intensity bar */}
        {alert.intensity_ratio !== null && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Intensity</span>
              <span>{alert.intensity_ratio.toFixed(1)}x threshold</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (alert.intensity_ratio / 4) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full ${
                  alert.intensity_ratio < 1 ? 'bg-green-500' :
                  alert.intensity_ratio < 2 ? 'bg-yellow-500' :
                  alert.intensity_ratio < 3 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>Normal</span>
              <span>1x</span>
              <span>2x</span>
              <span>3x</span>
              <span>4x+</span>
            </div>
          </div>
        )}

        {/* Duration estimate */}
        {alert.active && alert.duration_days !== null && (
          <div className="flex items-center gap-2 text-sm">
            <i className="fi fi-rr-clock text-gray-400" />
            <span className="text-gray-600">
              Estimated duration: <span className="font-medium">{alert.duration_days} days</span>
            </span>
          </div>
        )}

        {/* Ecological impact */}
        <div className={`p-3 rounded-lg ${alert.active ? 'bg-white/60' : 'bg-white/40'}`}>
          <h4 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
            <i className="fi fi-rr-leaf text-gray-500" />
            Ecological Impact
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {alert.ecological_impact}
          </p>
        </div>

        {/* Recommendations */}
        {alert.recommendations.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <i className="fi fi-rr-clipboard-list text-gray-500" />
              Monitoring Recommendations
            </h4>
            <ul className="space-y-1">
              {alert.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <i className={`fi fi-rr-angle-right ${config.iconColor} mt-0.5 text-xs`} />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Data source */}
        <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-200">
          Data: Copernicus Marine Service SST Analysis. Classification: Hobday et al. 2018.
        </p>
      </div>
    </motion.div>
  );
}

/**
 * Compact version for use in headers or sidebars
 */
export function HeatwaveAlertBadge({ alert }: { alert: MarineHeatwaveAlert }) {
  const config = categoryConfig[alert.category];

  if (!alert.active) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
    >
      <i className={`fi fi-rr-${config.icon} text-[10px]`} />
      <span>Heatwave: {alert.category}</span>
      {alert.anomaly !== null && (
        <span className="font-bold">+{alert.anomaly}°C</span>
      )}
    </motion.div>
  );
}
