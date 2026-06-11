'use client';

/**
 * ChangePasswordSection Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages user password changes with secure validation:
 * - Current password verification
 * - New password strength validation (minimum 8 characters)
 * - Password confirmation matching
 * - Prevents reusing the current password
 * - Bidirectional language support (EN/AR) with automatic RTL layout
 * - Dark mode support with proper styling
 * 
 * @component
 * @returns {JSX.Element} Password change form with validation
 * 
 * @example
 * <ChangePasswordSection />
 */

import React, { useState } from 'react';
import { AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { validatePasswordChange } from '@/utils/profile.validation';
import { validatePassword } from '@/utils/password';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import authService from '@/services/auth.service';
import { toast } from 'react-hot-toast';

/**
 * ChangePasswordSection Component
 * Provides a secure form for users to change their password with comprehensive
 * validation and error handling.
 * 
 * Validation Rules:
 * - Current password is required and verified by backend
 * - New password minimum 8 characters
 * - New password must differ from current password
 * - Confirmation password must match new password
 * 
 * Features:
 * - Secure API call via PATCH /auth/change-password
 * - Real-time error clearing on input
 * - Internationalization (EN/AR)
 * - Dark mode support
 * - Loading state during submission
 */
export const ChangePasswordSection = () => {
  const { t, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const result = validatePasswordChange({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
      confirmNewPassword: formData.confirmNewPassword,
    });

    const translatedErrors: Record<string, string> = {};
    // Map existing validation keys to translations
    Object.entries(result.errors).forEach(([key, errorKey]) => {
      translatedErrors[key] = t(errorKey as any);
    });

    // Use the same password validation used in signup for identical messages
    if (formData.newPassword) {
      const pwValidation = validatePassword(formData.newPassword);
      if (!pwValidation.isValid) {
        translatedErrors.newPassword = pwValidation.errors[0];
      }
    }

    // Enforce reuse check
    if (formData.currentPassword && formData.currentPassword === formData.newPassword) {
      translatedErrors.newPassword = t('profile.passwordDifferent');
    }

    // Confirm password
    if (formData.confirmNewPassword && formData.newPassword !== formData.confirmNewPassword) {
      translatedErrors.confirmNewPassword = t('profile.passwordMismatch');
    }

    setErrors(translatedErrors);
    return Object.keys(translatedErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation for new password and confirmation to match signup UX
    if (name === 'newPassword') {
      const pwValidation = validatePassword(value);
      if (!pwValidation.isValid) {
        setErrors(prev => ({ ...prev, newPassword: pwValidation.errors[0] }));
      } else if (value && value === formData.currentPassword) {
        setErrors(prev => ({ ...prev, newPassword: t('profile.passwordDifferent') }));
      } else {
        setErrors(prev => ({ ...prev, newPassword: '' }));
      }

      // clear confirm error if it now matches
      if (formData.confirmNewPassword && value === formData.confirmNewPassword) {
        setErrors(prev => ({ ...prev, confirmNewPassword: '' }));
      }

      return;
    }

    if (name === 'confirmNewPassword') {
      if (formData.newPassword && value !== formData.newPassword) {
        setErrors(prev => ({ ...prev, confirmNewPassword: t('profile.passwordMismatch') }));
      } else {
        setErrors(prev => ({ ...prev, confirmNewPassword: '' }));
      }
      return;
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success(t('profile.passwordUpdated'));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setErrors({});
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error?.response?.data?.message || t('profile.passwordUpdateFailed');
      
      if (errorMessage.includes('current') || errorMessage.includes('Current')) {
        setErrors({ currentPassword: t('profile.invalidCurrentPassword') });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <h2 className={`text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Lock className="w-5 h-5" />
          {t('profile.changingPassword')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.currentPassword')}
          </label>
          <div className="relative">
            <Lock className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder={t('profile.currentPasswordPlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-10 pr-10' : 'pl-10 pr-10'} ${
                errors.currentPassword ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((prev) => !prev)}
              className={`absolute top-2.5 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.currentPassword}
            </div>
          )}
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.newPassword')}
          </label>
          <div className="relative">
            <Lock className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder={t('profile.newPasswordPlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-10 pr-10' : 'pl-10 pr-10'} ${
                errors.newPassword ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className={`absolute top-2.5 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.newPassword}
            </div>
          )}
          {formData.newPassword && (
            <PasswordStrengthMeter password={formData.newPassword} showRequirements={true} className="mt-2" />
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.confirmNewPassword')}
          </label>
          <div className="relative">
            <Lock className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmNewPassword"
              value={formData.confirmNewPassword}
              onChange={handleChange}
              placeholder={t('profile.confirmNewPasswordPlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-10 pr-10' : 'pl-10 pr-10'} ${
                errors.confirmNewPassword ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className={`absolute top-2.5 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmNewPassword && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.confirmNewPassword}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {t('profile.changingPass')}
              </span>
            ) : (
              t('profile.changePassword')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};