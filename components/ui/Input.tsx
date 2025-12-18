import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-3 text-base bg-white border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed';

    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 hover:border-gray-400';

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthStyles} ${className}`}>
        {label && (
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${errorStyles} touch-target`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <span>⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = false, className = '', ...props }, ref) => {
    const baseStyles =
      'w-full px-4 py-3 text-base bg-white border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none';

    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 hover:border-gray-400';

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthStyles} ${className}`}>
        {label && (
          <label className="block mb-2 text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${baseStyles} ${errorStyles}`}
          rows={4}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <span>⚠</span>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
