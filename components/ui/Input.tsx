'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode, useId } from 'react';

type InputSize = 'sm' | 'md' | 'lg';
type InputVariant = 'default' | 'filled' | 'outline';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: InputSize;
  variant?: InputVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
}

const inputSizes: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[38px]',
  md: 'px-4 py-3 text-base min-h-[46px]',
  lg: 'px-5 py-4 text-lg min-h-[54px]',
};

const inputVariants: Record<InputVariant, { base: string; error: string }> = {
  default: {
    base: `
      bg-white border-2 border-balean-gray-200
      hover:border-balean-gray-300
      focus:border-balean-cyan focus:ring-2 focus:ring-balean-cyan/20
    `,
    error: 'border-critical focus:border-critical focus:ring-critical/20',
  },
  filled: {
    base: `
      bg-balean-gray-50 border-2 border-transparent
      hover:bg-balean-gray-100
      focus:bg-white focus:border-balean-cyan focus:ring-2 focus:ring-balean-cyan/20
    `,
    error: 'bg-critical/5 border-critical focus:border-critical focus:ring-critical/20',
  },
  outline: {
    base: `
      bg-transparent border-2 border-balean-gray-200
      hover:border-balean-navy
      focus:border-balean-cyan focus:ring-2 focus:ring-balean-cyan/20
    `,
    error: 'border-critical focus:border-critical focus:ring-critical/20',
  },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    helperText,
    fullWidth = false,
    size = 'md',
    variant = 'default',
    leftIcon,
    rightIcon,
    onRightIconClick,
    className = '',
    id,
    ...props
  }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const baseStyles = `
      w-full rounded-xl
      text-balean-navy placeholder:text-balean-gray-400
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variantStyles = error
      ? inputVariants[variant].error
      : inputVariants[variant].base;

    const widthStyles = fullWidth ? 'w-full' : '';
    const paddingLeft = leftIcon ? 'pl-11' : '';
    const paddingRight = rightIcon ? 'pr-11' : '';

    return (
      <div className={`${widthStyles} ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block mb-2 text-sm font-semibold text-balean-navy"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-balean-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseStyles}
              ${variantStyles}
              ${inputSizes[size]}
              ${paddingLeft}
              ${paddingRight}
              touch-target
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperId}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className={`
                absolute right-4 top-1/2 -translate-y-1/2
                text-balean-gray-400 hover:text-balean-navy
                transition-colors
                ${onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'}
              `}
              tabIndex={onRightIconClick ? 0 : -1}
            >
              {rightIcon}
            </button>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-critical flex items-center gap-1.5"
            role="alert"
          >
            <i className="fi fi-rr-exclamation text-xs" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-2 text-sm text-balean-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Component
interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  size?: InputSize;
  variant?: InputVariant;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const resizeStyles = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    helperText,
    fullWidth = false,
    size = 'md',
    variant = 'default',
    resize = 'vertical',
    className = '',
    id,
    rows = 4,
    ...props
  }, ref) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    const baseStyles = `
      w-full rounded-xl
      text-balean-navy placeholder:text-balean-gray-400
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variantStyles = error
      ? inputVariants[variant].error
      : inputVariants[variant].base;

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthStyles} ${className}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block mb-2 text-sm font-semibold text-balean-navy"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
            ${baseStyles}
            ${variantStyles}
            ${inputSizes[size]}
            ${resizeStyles[resize]}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperId}
          {...props}
        />

        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-critical flex items-center gap-1.5"
            role="alert"
          >
            <i className="fi fi-rr-exclamation text-xs" />
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="mt-2 text-sm text-balean-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Search Input - specialized search component
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon' | 'type'> {
  onClear?: () => void;
  showClear?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, showClear = true, value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<i className="fi fi-rr-search text-lg" />}
        rightIcon={
          showClear && hasValue ? (
            <i className="fi fi-rr-cross-small text-lg" />
          ) : undefined
        }
        onRightIconClick={hasValue ? onClear : undefined}
        value={value}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
