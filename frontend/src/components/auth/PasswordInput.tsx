/**
 * Password Input Component
 * Text input with show/hide password toggle
 */

'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  showToggle?: boolean;
  forceLTR?: boolean;
}

/**
 * Password Input Component
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({
  label,
  error,
  required = false,
  helpText,
  showToggle = true,
  className = '',
  forceLTR = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          dir={forceLTR ? 'ltr' : undefined}
          className={`
            w-full px-4 py-2.5 pr-10 text-sm
            border rounded-lg transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-800 dark:text-white dark:border-gray-600
            ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-transparent'
            }
            ${forceLTR ? 'input-ltr' : ''}
            ${className}
          `}
          {...props}
        />

        {showToggle && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
