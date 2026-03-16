'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/ui';

type MetricStatus = 'good' | 'caution' | 'danger' | 'neutral';

interface ConditionMetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  status?: MetricStatus;
}

const STATUS_STYLES: Record<MetricStatus, { bg: string; border: string; iconColor: string }> = {
  good: { bg: 'bg-green-50', border: 'border-green-200', iconColor: 'text-green-600' },
  caution: { bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-600' },
  neutral: { bg: 'bg-gray-50', border: 'border-gray-200', iconColor: 'text-gray-600' },
};

export function ConditionMetricCard({
  icon,
  label,
  value,
  subValue,
  status = 'neutral',
}: ConditionMetricCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl p-3 border ${styles.bg} ${styles.border}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size="sm" className={styles.iconColor} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>
      )}
    </motion.div>
  );
}
