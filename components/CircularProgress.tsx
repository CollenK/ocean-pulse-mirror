'use client';

import { motion } from 'framer-motion';

interface CircularProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl';
  thickness?: number;
  color?: 'healthy' | 'warning' | 'critical' | 'info' | 'primary';
  label?: string;
  sublabel?: string;
  showPercentage?: boolean;
  className?: string;
}

const sizes = {
  sm: 60,
  md: 80,
  lg: 120,
  xl: 160,
};

const colors = {
  healthy: {
    stroke: '#22C55E',
    background: '#DCFCE7',
  },
  warning: {
    stroke: '#F59E0B',
    background: '#FEF3C7',
  },
  critical: {
    stroke: '#EF4444',
    background: '#FEE2E2',
  },
  info: {
    stroke: '#3B82F6',
    background: '#DBEAFE',
  },
  primary: {
    stroke: '#0EA5E9',
    background: '#E0F2FE',
  },
};

export function CircularProgress({
  value,
  size = 'md',
  thickness = 8,
  color = 'primary',
  label,
  sublabel,
  showPercentage = true,
  className = '',
}: CircularProgressProps) {
  const diameter = sizes[size];
  const radius = (diameter - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colorScheme = colors[color];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={colorScheme.background}
          strokeWidth={thickness}
          fill="none"
        />

        {/* Progress circle */}
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          stroke={colorScheme.stroke}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 1,
            ease: 'easeOut',
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span
            className={`font-bold text-ocean-deep ${
              size === 'sm' ? 'text-sm' :
              size === 'md' ? 'text-base' :
              size === 'lg' ? 'text-2xl' :
              'text-3xl'
            }`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {Math.round(value)}%
          </motion.span>
        )}

        {label && (
          <span className={`text-gray-600 ${
            size === 'sm' || size === 'md' ? 'text-xs' : 'text-sm'
          }`}>
            {label}
          </span>
        )}

        {sublabel && (
          <span className="text-xs text-gray-400 mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Get color based on health score
 */
export function getHealthColor(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 75) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}
