'use client';

/**
 * ProfileForm Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages user profile information editing including:
 * - Full name, email, phone, location, and address
 * - Real-time form validation with error feedback
 * - Unsaved changes tracking with save/cancel buttons
 * - Bidirectional language support (EN/AR) with automatic RTL layout
 * - Dark mode support with proper styling
 * 
 * @component
 * @returns {JSX.Element} Profile editing form with validation
 * 
 * @example
 * <ProfileForm />
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, User, Mail, MapPin, Phone } from 'lucide-react';
import profileService from '@/services/profile.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { validateProfileUpdate, PROFILE_LIMITS } from '@/utils/profile.validation';
import { hasUnsafeContent, isInvalidFullName } from '@/utils/security';
import { toast } from 'react-hot-toast';
import { broadcastSync } from '@/lib/crossTabSync';
import { filterPhoneInput, PHONE_REGEX } from '@/utils/phoneUtils';

/**
 * Profile form data interface
 * @interface ProfileFormData
 * @property {string} fullName - User's full name
 * @property {string} email - User's email address (display only)
 * @property {string} [phone] - User's phone number (optional)
 * @property {string} [location] - User's location (optional)
 * @property {string} [address] - User's address (optional)
 */
interface ProfileFormData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
}

/**
 * ProfileForm Component
 * Provides a comprehensive form for users to edit their profile information
 * with validation, error handling, and change tracking.
 * 
 * Features:
 * - E-mail and phone validation
 * - Unsaved changes detection
 * - Real-time error clearing on input
 * - Internationalization (EN/AR)
 * - Dark mode support
 * - Loading and saving states
 */
export const ProfileForm = () => {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const { t, isRTL } = useLanguage();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    address: '',
  });

  const [initialData, setInitialData] = useState<ProfileFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        if (user && user.profile) {
          const userData: ProfileFormData = {
            fullName: user.profile.fullName || '',
            email: user.email || '',
            phone: user.profile.phoneNumber || '',
            location: user.profile.location || '',
            address: user.profile.address || '',
          };
          setFormData(userData);
          setInitialData(userData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error(t('profile.loadError'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, t]);

  useEffect(() => {
    if (initialData) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
      setHasChanges(hasChanged);
    }
  }, [formData, initialData]);

  const validateForm = (): boolean => {
    const result = validateProfileUpdate({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      address: formData.address,
    });

    // Map translation keys to translated error messages
    const translatedErrors: Record<string, string> = {};
    Object.entries(result.errors).forEach(([key, errorKey]) => {
      translatedErrors[key] = t(errorKey as any);
    });

    setErrors(translatedErrors);
    return result.isValid;
  };

  const validateFieldRealtime = (name: string, value: string): string => {
    if (name === 'fullName') {
      if (!value.trim()) return t('nameRequired');
      if (isInvalidFullName(value)) return t('validation.fullNameInvalid');
      if (value.length > PROFILE_LIMITS.fullName) return t('validation.maxLength');
    }
    if (name === 'phone' && value) {
      if (!PHONE_REGEX.test(value.trim()) || !/[0-9]/.test(value)) return t('invalidPhone');
    }
    if (name === 'location' && value) {
      if (hasUnsafeContent(value)) return t('validation.invalidText');
      if (value.length > PROFILE_LIMITS.location) return t('validation.maxLength');
    }
    if (name === 'address' && value) {
      if (hasUnsafeContent(value)) return t('validation.invalidText');
      if (value.length > PROFILE_LIMITS.address) return t('validation.maxLength');
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newValue = name === 'phone' ? filterPhoneInput(value) : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    const err = validateFieldRealtime(name, newValue);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('error'));
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        fullName: formData.fullName,
        phoneNumber: formData.phone,
        location: formData.location,
        address: formData.address,
      };

      const response = await profileService.updateProfile(updateData);
      
      // Update user in auth store + sync all other open tabs
      if (user) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            ...updateData,
          },
        };
        setUser(updatedUser as any);
        broadcastSync({ type: 'AUTH_USER_UPDATED', user: updatedUser });
      }

      setInitialData(formData);
      toast.success(t('profile.profileUpdated'));
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error?.response?.data?.message || t('profile.profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (initialData) {
      setFormData(initialData);
      setHasChanges(false);
      setErrors({});
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow">
      <div className="border-b border-gray-200 dark:border-slate-700 px-6 py-4">
        <h2 className={`text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <User className="w-5 h-5" />
          {t('profile.personalInfo')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.fullName')}
          </label>
          <div className="relative">
            <User className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              maxLength={PROFILE_LIMITS.fullName}
              placeholder={t('profile.fullNamePlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-4 pr-10' : 'pl-10'} ${
                errors.fullName ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
          </div>
          {errors.fullName && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.fullName}
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.email')}
          </label>
          <div className="relative">
            <Mail className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              placeholder={t('profile.emailPlaceholder')}
              dir="ltr"
              className={`input-ltr w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed focus:ring-0 focus:border-gray-300 dark:bg-slate-800/60 dark:text-slate-300 transition-colors ${isRTL ? 'text-right pl-4 pr-10' : 'pl-10'} ${
                errors.email ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
          </div>
          {errors.email && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </div>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.phone')}
          </label>
          <div className="relative">
            <Phone className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              maxLength={PROFILE_LIMITS.phone}
              placeholder={t('profile.phonePlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-4 pr-10' : 'pl-10'} ${
                errors.phone ? 'border-red-500 focus:ring-red-500' : ''
              }`}
            />
          </div>
          {errors.phone && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.phone}
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.location')}
          </label>
          <div className="relative">
            <MapPin className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              maxLength={PROFILE_LIMITS.location}
              placeholder={t('profile.locationPlaceholder')}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right pl-4 pr-10' : 'pl-10'} ${errors.location ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.location && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.location}
            </div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('profile.address')}
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            maxLength={PROFILE_LIMITS.address}
            placeholder={t('profile.addressPlaceholder')}
            rows={3}
            className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white transition-colors ${isRTL ? 'text-right' : ''} ${errors.address ? 'border-red-500' : ''}`}
          />
          {errors.address && (
            <div className="flex items-center gap-1 mt-1 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.address}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {t('profile.savingChanges')}
              </span>
            ) : (
              t('profile.saveChanges')
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="flex-1 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};
