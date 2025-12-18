import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'healthy' | 'moderate' | 'at-risk' | 'info' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold rounded-full';

  const variants = {
    default: 'bg-gray-100 text-gray-800',
    healthy: 'bg-green-100 text-green-800 border border-green-200',
    moderate: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'at-risk': 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
    warning: 'bg-orange-100 text-orange-800 border border-orange-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

interface HealthBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export function HealthBadge({ score, size = 'md', showScore = true }: HealthBadgeProps) {
  const getHealthVariant = (score: number): 'healthy' | 'moderate' | 'at-risk' => {
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'moderate';
    return 'at-risk';
  };

  const getHealthLabel = (score: number): string => {
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Moderate';
    return 'At Risk';
  };

  const getHealthIcon = (score: number): string => {
    if (score >= 80) return '✓';
    if (score >= 50) return '⚠';
    return '✕';
  };

  const variant = getHealthVariant(score);
  const label = getHealthLabel(score);
  const icon = getHealthIcon(score);

  return (
    <Badge variant={variant} size={size}>
      {icon} {label}
      {showScore && ` (${score})`}
    </Badge>
  );
}
