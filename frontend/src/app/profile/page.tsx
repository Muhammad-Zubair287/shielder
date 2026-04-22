'use client';

/**
 * Profile Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Main user profile page that combines all profile-related components:
 * - Profile image upload with preview and removal
 * - Profile information editing (name, email, phone, location, etc.)
 * - Password change section
 * 
 * Features:
 * - Authentication protection (redirects to login if not authenticated)
 * - Responsive layout for mobile and desktop
 * - Bidirectional language support (EN/AR) with automatic RTL layout
 * - Dark mode support with gradient background
 * - Loading states
 * - Real-time data synchronization with backend API
 * 
 * @page
 * @route /profile
 * @returns {JSX.Element} Complete profile management page
 * 
 * @example
 * // Navigate to profile page
 * router.push('/profile');
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ChangePasswordSection } from '@/components/profile/ChangePasswordSection';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ROUTES } from '@/utils/constants';

/**
 * ProfilePage Component
 * Renders the complete user profile management page with authentication guard,
 * responsive layout, and all profile components.
 * 
 * Access Control:
 * - Only authenticated users can access this page
 * - Unauthenticated users are redirected to login
 * 
 * Layout Sections:
 * 1. Header with localized title and subtitle
 * 2. Profile image upload section
 * 3. Profile information form
 * 4. Password change section
 * 
 * @returns {JSX.Element} Profile management page
 */
export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.replace(ROUTES.LOGIN);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4 sm:px-6 lg:px-8 ${isRTL ? 'dir-rtl' : ''}`}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* Profile Image Upload */}
        <div className="mb-8">
          <ProfileImageUpload />
        </div>

        {/* Profile Form */}
        <div className="mb-8">
          <ProfileForm />
        </div>

        {/* Change Password Section */}
        <div>
          <ChangePasswordSection />
        </div>
      </div>
    </div>
  );
}
