'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUALITY_TIER_CONFIG, type QualityTier } from '@/types/verification';

interface QualityTierBadgeProps {
  tier: QualityTier;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  verificationCount?: number;
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export function QualityTierBadge({
  tier,
  size = 'sm',
  showTooltip = true,
  verificationCount,
}: QualityTierBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const config = QUALITY_TIER_CONFIG[tier];

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
        <span>{config.label}</span>
      </button>

      <AnimatePresence>
        {tooltipOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56"
          >
            <div className="bg-balean-navy text-white rounded-xl p-3 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <i className={`fi ${config.icon}`} />
                <span className="font-semibold text-sm">{config.label}</span>
              </div>
              <p className="text-xs text-white/70 mb-2">{config.description}</p>
              {verificationCount !== undefined && (
                <div className="bg-white/10 rounded-lg px-2 py-1">
                  <p className="text-[10px] text-white/60">
                    {verificationCount} verification{verificationCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-balean-navy rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
