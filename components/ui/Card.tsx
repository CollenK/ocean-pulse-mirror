'use client';

import { ReactNode, HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';

type CardVariant = 'default' | 'elevated' | 'glass' | 'navy' | 'yellow' | 'gradient' | 'outline';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  interactive?: boolean;
  animated?: boolean;
  glow?: 'cyan' | 'coral' | 'yellow' | 'none';
}

const cardVariants: Record<CardVariant, string> = {
  default: `
    bg-white
    border border-balean-gray-100
    shadow-sm
  `,
  elevated: `
    bg-white
    border border-balean-gray-100
    shadow-md
  `,
  glass: `
    bg-white/90 backdrop-blur-xl
    border border-white/20
    shadow-lg
  `,
  navy: `
    bg-balean-navy
    text-white
    border border-balean-navy-light/20
  `,
  yellow: `
    bg-balean-yellow
    text-balean-navy
    border border-balean-yellow-dark/20
  `,
  gradient: `
    bg-gradient-to-br from-balean-cyan via-balean-navy to-balean-coral
    text-white
    border-none
  `,
  outline: `
    bg-transparent
    border-2 border-balean-gray-200
    hover:border-balean-cyan
  `,
};

const cardPaddings: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
};

const glowStyles: Record<string, string> = {
  cyan: 'hover:shadow-[0_0_40px_rgba(0,181,226,0.15)]',
  coral: 'hover:shadow-[0_0_40px_rgba(255,88,93,0.15)]',
  yellow: 'hover:shadow-[0_0_40px_rgba(251,216,114,0.25)]',
  none: '',
};

const cardMotion: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  hover = false,
  interactive = false,
  animated = false,
  glow = 'none',
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'rounded-2xl transition-all duration-300';
  const hoverStyles = hover ? 'hover:-translate-y-1 hover:shadow-lg' : '';
  const interactiveStyles = interactive ? 'cursor-pointer active:scale-[0.99]' : '';

  const combinedClassName = `
    ${baseStyles}
    ${cardVariants[variant]}
    ${cardPaddings[padding]}
    ${hoverStyles}
    ${interactiveStyles}
    ${glowStyles[glow]}
    ${className}
  `.trim();

  if (animated) {
    return (
      <motion.div
        ref={ref}
        className={combinedClassName}
        variants={cardMotion}
        initial="initial"
        animate="animate"
        whileHover={hover ? 'hover' : undefined}
        whileTap={interactive ? 'tap' : undefined}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        {...(props as HTMLMotionProps<'div'>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      ref={ref}
      className={combinedClassName}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Card Header
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className = '', action }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Card Title
interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const titleSizes = {
  sm: 'text-base font-semibold',
  md: 'text-lg font-bold',
  lg: 'text-xl font-bold',
  xl: 'text-2xl font-bold',
};

export function CardTitle({
  children,
  className = '',
  as: Component = 'h3',
  size = 'lg',
}: CardTitleProps) {
  return (
    <Component className={`text-balean-navy font-display tracking-tight ${titleSizes[size]} ${className}`}>
      {children}
    </Component>
  );
}

// Card Subtitle
interface CardSubtitleProps {
  children: ReactNode;
  className?: string;
}

export function CardSubtitle({ children, className = '' }: CardSubtitleProps) {
  return (
    <p className={`text-balean-gray-400 text-sm mt-1 ${className}`}>
      {children}
    </p>
  );
}

// Card Content
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-balean-gray-500 ${className}`}>
      {children}
    </div>
  );
}

// Card Footer
interface CardFooterProps {
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}

export function CardFooter({ children, className = '', bordered = true }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-4 ${bordered ? 'border-t border-balean-gray-100' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Feature Card - specialized card for feature highlights
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color?: 'cyan' | 'coral' | 'yellow' | 'navy';
  className?: string;
}

const featureColors = {
  cyan: 'bg-balean-cyan/10 text-balean-cyan',
  coral: 'bg-balean-coral/10 text-balean-coral',
  yellow: 'bg-balean-yellow/20 text-balean-yellow-dark',
  navy: 'bg-balean-navy/10 text-balean-navy',
};

export function FeatureCard({ icon, title, description, color = 'cyan', className = '' }: FeatureCardProps) {
  return (
    <Card variant="elevated" hover glow={color === 'navy' ? 'cyan' : color} className={className}>
      <div className={`w-14 h-14 rounded-2xl ${featureColors[color]} flex items-center justify-center mb-4`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <CardTitle size="md">{title}</CardTitle>
      <CardContent className="mt-2">{description}</CardContent>
    </Card>
  );
}

// Stat Card - for displaying metrics
interface StatCardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  color?: 'cyan' | 'coral' | 'yellow' | 'navy';
  className?: string;
}

export function StatCard({ value, label, icon, trend, color = 'cyan', className = '' }: StatCardProps) {
  return (
    <Card variant="elevated" padding="lg" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-balean-gray-400 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-balean-navy font-display">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${
              trend.direction === 'up' ? 'text-healthy' : 'text-balean-coral'
            }`}>
              <i className={`fi fi-rr-arrow-${trend.direction === 'up' ? 'trend-up' : 'trend-down'} text-xs`} />
              {trend.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl ${featureColors[color]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
