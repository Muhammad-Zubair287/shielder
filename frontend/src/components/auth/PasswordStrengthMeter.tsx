/**
 * Password Strength Meter Component
 * Displays password strength visually with requirements checklist
 */

'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import {
  getPasswordStrength,
  getPasswordRequirements,
} from '@/utils/password';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

/**
 * Password Strength Meter Component
 */
export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
  className = '',
}) => {
  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Password Strength:</span>
          <span className={`font-semibold ${
            strength.score === 0 ? 'text-gray-500' :
            strength.score === 1 ? 'text-red-600' :
            strength.score === 2 ? 'text-orange-600' :
            strength.score === 3 ? 'text-yellow-600' :
            strength.score === 4 ? 'text-lime-600' :
            'text-green-600'
          }`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password Requirements:
          </p>
          <div className="space-y-1.5">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-xs ${
                  req.met
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
