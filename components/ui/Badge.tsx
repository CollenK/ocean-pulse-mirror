'use client';

import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'cyan' | 'coral' | 'yellow' | 'navy' | 'success' | 'warning' | 'danger' | 'outline' | 'healthy' | 'moderate' | 'at-risk' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-balean-gray-100 text-balean-gray-600',
  cyan: 'bg-balean-cyan/10 text-balean-cyan',
  coral: 'bg-balean-coral/10 text-balean-coral',
  yellow: 'bg-balean-yellow/20 text-balean-yellow-dark',
  navy: 'bg-balean-navy/10 text-balean-navy',
  success: 'bg-healthy/10 text-healthy',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-critical/10 text-critical',
  outline: 'bg-transparent border border-balean-gray-200 text-balean-gray-500',
  // Legacy variants for backwards compatibility
  healthy: 'bg-healthy/10 text-healthy border border-healthy/20',
  moderate: 'bg-warning/10 text-warning border border-warning/20',
  'at-risk': 'bg-critical/10 text-critical border border-critical/20',
  info: 'bg-balean-cyan/10 text-balean-cyan border border-balean-cyan/20',
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-medium rounded-full
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Health Badge - specialized for health scores
interface HealthBadgeProps {
  score: number;
  size?: BadgeSize;
  showScore?: boolean;
  className?: string;
}

export function HealthBadge({ score, size = 'md', showScore = true, className = '' }: HealthBadgeProps) {
  const getHealthConfig = (score: number) => {
    if (score >= 70) {
      return {
        variant: 'healthy' as BadgeVariant,
        label: 'Good',
        icon: <i className="fi fi-rr-check-circle text-xs" />,
      };
    }
    if (score >= 40) {
      return {
        variant: 'moderate' as BadgeVariant,
        label: 'Moderate',
        icon: <i className="fi fi-rr-info text-xs" />,
      };
    }
    return {
      variant: 'at-risk' as BadgeVariant,
      label: 'Needs Attention',
      icon: <i className="fi fi-rr-exclamation text-xs" />,
    };
  };

  const { variant, label, icon } = getHealthConfig(score);

  return (
    <Badge variant={variant} size={size} icon={icon} className={className}>
      {label}
      {showScore && ` (${score})`}
    </Badge>
  );
}

// Status Badge - for status indicators
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'syncing' | 'error';
  size?: BadgeSize;
  className?: string;
}

const statusConfig = {
  online: { variant: 'success' as BadgeVariant, label: 'Online', dot: true },
  offline: { variant: 'default' as BadgeVariant, label: 'Offline', dot: true },
  syncing: { variant: 'cyan' as BadgeVariant, label: 'Syncing', dot: true },
  error: { variant: 'danger' as BadgeVariant, label: 'Error', dot: true },
};

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} size={size} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}

// Conservation Status Badge
interface ConservationBadgeProps {
  status: 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';
  size?: BadgeSize;
  showFull?: boolean;
  className?: string;
}

const conservationConfig: Record<string, { variant: BadgeVariant; label: string; full: string }> = {
  LC: { variant: 'success', label: 'LC', full: 'Least Concern' },
  NT: { variant: 'cyan', label: 'NT', full: 'Near Threatened' },
  VU: { variant: 'yellow', label: 'VU', full: 'Vulnerable' },
  EN: { variant: 'warning', label: 'EN', full: 'Endangered' },
  CR: { variant: 'danger', label: 'CR', full: 'Critically Endangered' },
  EW: { variant: 'coral', label: 'EW', full: 'Extinct in Wild' },
  EX: { variant: 'navy', label: 'EX', full: 'Extinct' },
  DD: { variant: 'default', label: 'DD', full: 'Data Deficient' },
  NE: { variant: 'outline', label: 'NE', full: 'Not Evaluated' },
};

export function ConservationBadge({ status, size = 'md', showFull = false, className = '' }: ConservationBadgeProps) {
  const config = conservationConfig[status];
  return (
    <Badge variant={config.variant} size={size} className={className}>
      {showFull ? config.full : config.label}
    </Badge>
  );
}

// Report Type Badge
interface ReportTypeBadgeProps {
  type: 'species_sighting' | 'habitat_condition' | 'water_quality' | 'threat_concern' | 'enforcement_activity' | 'research_observation';
  size?: BadgeSize;
  className?: string;
}

const reportTypeConfig: Record<string, { variant: BadgeVariant; label: string; icon: string }> = {
  species_sighting: { variant: 'cyan', label: 'Species', icon: 'fi-rr-fish' },
  habitat_condition: { variant: 'success', label: 'Habitat', icon: 'fi-rr-tree' },
  water_quality: { variant: 'navy', label: 'Water', icon: 'fi-rr-water' },
  threat_concern: { variant: 'danger', label: 'Threat', icon: 'fi-rr-exclamation' },
  enforcement_activity: { variant: 'yellow', label: 'Patrol', icon: 'fi-rr-shield-check' },
  research_observation: { variant: 'default', label: 'Research', icon: 'fi-rr-document' },
};

export function ReportTypeBadge({ type, size = 'md', className = '' }: ReportTypeBadgeProps) {
  const config = reportTypeConfig[type];
  return (
    <Badge
      variant={config.variant}
      size={size}
      icon={<i className={`fi ${config.icon} text-xs`} />}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
