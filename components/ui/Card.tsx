import { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
}

export function Card({
  children,
  padding = 'md',
  shadow = 'md',
  hover = false,
  interactive = false,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'bg-white rounded-xl transition-all duration-300 border border-gray-100';

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-[0_2px_8px_rgba(15,23,42,0.06)]',
    lg: 'shadow-[0_4px_12px_rgba(15,23,42,0.1)]',
  };

  const hoverStyles = hover
    ? 'hover:shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:-translate-y-1'
    : '';
  const interactiveStyles = interactive
    ? 'cursor-pointer active:scale-[0.98]'
    : '';

  return (
    <div
      className={`${baseStyles} ${paddings[padding]} ${shadows[shadow]} ${hoverStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-xl font-semibold text-ocean-deep ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`text-gray-600 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-6 pt-6 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
