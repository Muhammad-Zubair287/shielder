'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PASSWORD_REQUIREMENTS } from '@/utils/password';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

function getStrengthScore(password: string): number {
  if (!password || password.length === 0) return -1;
  const checks = [
    password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    PASSWORD_REQUIREMENTS.HAS_UPPERCASE.test(password),
    PASSWORD_REQUIREMENTS.HAS_LOWERCASE.test(password),
    PASSWORD_REQUIREMENTS.HAS_NUMBER.test(password),
    PASSWORD_REQUIREMENTS.HAS_SPECIAL.test(password),
  ];
  return checks.filter(Boolean).length;
}

const STRENGTH_COLORS = ['#ef4444', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const STRENGTH_KEYS = [
  'passwordStrength.veryWeak',
  'passwordStrength.veryWeak',
  'passwordStrength.weak',
  'passwordStrength.fair',
  'passwordStrength.good',
  'passwordStrength.strong',
];

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
  className = '',
}) => {
  const { t } = useLanguage();
  const score = getStrengthScore(password);
  const isEmpty = score === -1;

  const safeIndex = Math.max(0, Math.min(isEmpty ? 0 : score, STRENGTH_KEYS.length - 1));
  const label = isEmpty ? t('passwordStrength.enterPrompt') : t(STRENGTH_KEYS[safeIndex]);
  const color = isEmpty ? '#d1d5db' : STRENGTH_COLORS[safeIndex];
  const percentage = isEmpty ? 0 : (score / 5) * 100;

  const requirements = [
    { key: 'passwordStrength.minChars',   met: password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH },
    { key: 'passwordStrength.uppercase',  met: PASSWORD_REQUIREMENTS.HAS_UPPERCASE.test(password) },
    { key: 'passwordStrength.lowercase',  met: PASSWORD_REQUIREMENTS.HAS_LOWERCASE.test(password) },
    { key: 'passwordStrength.number',     met: PASSWORD_REQUIREMENTS.HAS_NUMBER.test(password) },
    { key: 'passwordStrength.specialChar',met: PASSWORD_REQUIREMENTS.HAS_SPECIAL.test(password) },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('passwordStrength.label')}:</span>
          <span className="font-semibold" style={{ color: isEmpty ? '#6b7280' : color }}>
            {label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {showRequirements && password.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">
            {t('passwordStrength.requirements')}:
          </p>
          <div className="space-y-1.5">
            {requirements.map((req) => (
              <div key={req.key} className="flex items-center gap-2">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className={`text-xs ${req.met ? 'text-green-700' : 'text-gray-600'}`}>
                  {t(req.key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
