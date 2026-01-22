'use client';

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'yellow' | 'coral' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
  animated?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: `
    bg-balean-cyan text-white
    hover:bg-balean-cyan-dark
    shadow-md hover:shadow-lg hover:shadow-balean-cyan/20
    border-2 border-transparent
  `,
  secondary: `
    bg-white text-balean-navy
    border-2 border-balean-gray-200
    hover:border-balean-cyan hover:bg-balean-gray-50
    shadow-sm hover:shadow-md
  `,
  ghost: `
    bg-transparent text-balean-navy
    hover:bg-balean-navy/5
    border-2 border-transparent
  `,
  danger: `
    bg-balean-coral text-white
    hover:bg-balean-coral-dark
    shadow-md hover:shadow-lg hover:shadow-balean-coral/20
    border-2 border-transparent
  `,
  yellow: `
    bg-balean-yellow text-balean-navy
    hover:bg-balean-yellow-dark
    shadow-md hover:shadow-lg hover:shadow-balean-yellow/30
    border-2 border-transparent
    font-bold
  `,
  coral: `
    bg-balean-coral text-white
    hover:bg-balean-coral-dark
    shadow-md hover:shadow-lg hover:shadow-balean-coral/20
    border-2 border-transparent
  `,
  outline: `
    bg-transparent text-balean-cyan
    border-2 border-balean-cyan
    hover:bg-balean-cyan hover:text-white
  `,
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm min-h-[38px] rounded-xl gap-1.5',
  md: 'px-6 py-3 text-base min-h-[46px] rounded-xl gap-2',
  lg: 'px-8 py-4 text-lg min-h-[54px] rounded-2xl gap-2.5',
  xl: 'px-10 py-5 text-xl min-h-[62px] rounded-2xl gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  animated = true,
  ...props
}, ref) => {
  const baseStyles = `
    touch-target inline-flex items-center justify-center
    font-semibold
    transition-all duration-300 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balean-cyan focus-visible:ring-offset-2
  `;

  const widthClass = fullWidth ? 'w-full' : '';

  const buttonContent = (
    <>
      {loading ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0 flex items-center" aria-hidden="true">{icon}</span>
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0 flex items-center" aria-hidden="true">{icon}</span>
          )}
        </>
      )}
    </>
  );

  if (animated && !disabled && !loading) {
    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={`${baseStyles} ${buttonVariants[variant]} ${buttonSizes[size]} ${widthClass} ${className}`}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-disabled={disabled || loading}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {buttonContent}
      </motion.button>
    );
  }

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${buttonVariants[variant]} ${buttonSizes[size]} ${widthClass} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';

// Icon Button variant for compact icon-only buttons
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const iconSizes: Record<ButtonSize, string> = {
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  return (
    <Button
      ref={ref}
      size={size}
      className={`!p-0 ${iconSizes[size]} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
    </Button>
  );
});

IconButton.displayName = 'IconButton';
