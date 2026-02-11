'use client';

/**
 * IUURiskBadge Component
 *
 * Displays the IUU (Illegal, Unreported, Unregulated) fishing risk level
 * for a Marine Protected Area based on Global Fishing Watch data.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GFWIUURiskAssessment } from '@/types/gfw';

interface IUURiskBadgeProps {
  riskData: GFWIUURiskAssessment | null;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

// Risk level configuration
const RISK_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  low: {
    label: 'Low Risk',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: 'fi-rr-shield-check',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: 'fi-rr-shield-exclamation',
  },
  high: {
    label: 'High Risk',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: 'fi-rr-shield-exclamation',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: 'fi-rr-shield-cross',
  },
};

// Size variants
const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export function IUURiskBadge({
  riskData,
  loading = false,
  size = 'md',
  showTooltip = true,
}: IUURiskBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  if (loading) {
    return (
      <div className={`
        inline-flex items-center rounded-full bg-balean-gray-100 animate-pulse
        ${SIZE_CLASSES[size]}
      `}>
        <div className="w-3 h-3 rounded-full bg-balean-gray-200" />
        <span className="text-transparent">Loading</span>
      </div>
    );
  }

  if (!riskData) {
    return null;
  }

  const config = RISK_CONFIG[riskData.riskLevel] || RISK_CONFIG.low;

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => showTooltip && setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onClick={() => showTooltip && setTooltipOpen(!tooltipOpen)}
        className={`
          inline-flex items-center rounded-full border font-medium
          ${config.bgColor} ${config.color} ${config.borderColor}
          ${SIZE_CLASSES[size]}
          transition-colors hover:opacity-90
        `}
      >
        <i className={`fi ${config.icon}`} />
        <span>IUU: {config.label}</span>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64"
          >
            <div className="bg-balean-navy text-white rounded-xl p-3 shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">IUU Fishing Risk</span>
                <span className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${riskData.riskLevel === 'low' ? 'bg-green-500/20 text-green-300' : ''}
                  ${riskData.riskLevel === 'moderate' ? 'bg-amber-500/20 text-amber-300' : ''}
                  ${riskData.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-300' : ''}
                  ${riskData.riskLevel === 'critical' ? 'bg-red-500/20 text-red-300' : ''}
                `}>
                  Score: {riskData.riskScore}/100
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-[10px] text-white/60">Vessels Analyzed</p>
                  <p className="text-sm font-semibold">{riskData.vesselCount}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-[10px] text-white/60">High Risk Vessels</p>
                  <p className="text-sm font-semibold">{riskData.highRiskVesselCount}</p>
                </div>
              </div>

              {/* Risk Factors */}
              {riskData.factors.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/60 mb-1.5">Risk Factors</p>
                  <div className="space-y-1">
                    {riskData.factors.slice(0, 3).map((factor, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-white/80 truncate">{factor.description}</span>
                        <span className={`
                          px-1.5 rounded text-[10px]
                          ${factor.severity === 'high' ? 'bg-red-500/20 text-red-300' : ''}
                          ${factor.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' : ''}
                          ${factor.severity === 'low' ? 'bg-green-500/20 text-green-300' : ''}
                        `}>
                          {factor.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What is IUU */}
              <div className="mt-3 pt-2 border-t border-white/10">
                <p className="text-[10px] text-white/50">
                  IUU = Illegal, Unreported, Unregulated fishing.
                  Data from Global Fishing Watch.
                </p>
              </div>

              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-balean-navy rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version
export function IUURiskIndicator({
  riskLevel,
  size = 'sm',
}: {
  riskLevel: GFWIUURiskAssessment['riskLevel'] | null;
  size?: 'sm' | 'md';
}) {
  if (!riskLevel) return null;

  const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.low;
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <div
      className={`${sizeClasses} rounded-full ${config.bgColor.replace('bg-', 'bg-').replace('-50', '-400')}`}
      title={`IUU Risk: ${config.label}`}
    />
  );
}
