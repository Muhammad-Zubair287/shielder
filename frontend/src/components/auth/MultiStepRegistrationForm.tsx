/**
 * Multi-Step Registration Form Component
 * Three-step registration: Personal Info → Company Info → Security
 */

'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthAlert } from './AuthAlert';
import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PASSWORD_REQUIREMENTS } from '@/utils/password';
import {
  MultiStepRegistrationData,
  MultiStepRegistrationErrors,
  validateRegistrationStep,
} from './multi-step-registration.validation';

type FormData = MultiStepRegistrationData;
type FormErrors = MultiStepRegistrationErrors;

interface MultiStepRegistrationFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Multi-Step Registration Form Component
 */
export const MultiStepRegistrationForm: React.FC<MultiStepRegistrationFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    location: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateStep = (currentStep: 1 | 2 | 3): boolean => {
    const newErrors = validateRegistrationStep(currentStep, formData, t);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 3) {
        setStep(((step + 1) as 1 | 2 | 3));
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(((step - 1) as 1 | 2 | 3));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(3)) {
      setApiError(null);
      try {
        await onSubmit(formData);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('registerError');
        setApiError(message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      {apiError && (
        <AuthAlert
          type="error"
          message={apiError}
          onDismiss={() => setApiError(null)}
          className="mb-6"
        />
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 1 && t('personalInfo')}
            {step === 2 && t('companyInfo')}
            {step === 3 && t('securitySettings')}
          </h2>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('stepOf').replace('{step}', String(step))}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Personal Information */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder={t('enterName')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.fullName && (
              <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t('emailPlaceholder')}
              dir="ltr"
              className={`input-ltr w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('phone')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="05XXXXXXXX or +966 5X XXX XXXX"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('address')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder={t('enterAddress')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.address && (
              <p className="text-sm text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.location')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder={t('profile.locationPlaceholder')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.location && (
              <p className="text-sm text-red-500 mt-1">{errors.location}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Company Information */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('company')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder={t('enterCompany')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                errors.companyName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              💡 {t('createAccountDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Security Settings */}
      {step === 3 && (
        <div className="space-y-4">
          <PasswordInput
            label={t('password')}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            required
            maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
            placeholder={t('passwordPlaceholder')}
            forceLTR
          />

          {formData.password && (
            <PasswordStrengthMeter
              password={formData.password}
              showRequirements={true}
            />
          )}

          <PasswordInput
            label={t('confirmPassword')}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={errors.confirmPassword}
            required
            maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
            placeholder={t('confirmPasswordPlaceholder')}
            forceLTR
          />

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-900 dark:text-green-200">
              🔒 {t('createAccountDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={step === 1 || isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('previous')}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('creating') : t('createAccountBtn')}
          </button>
        )}
      </div>
    </form>
  );
};
