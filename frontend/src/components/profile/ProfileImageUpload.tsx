'use client';

/**
 * ProfileImageUpload Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages user profile image upload with preview and removal:
 * - File type validation (JPEG, PNG, WebP only)
 * - File size validation (max 2MB)
 * - Image preview with fallback avatar
 * - Upload and remove functionality
 * - Error handling with user feedback
 * - Bidirectional language support (EN/AR) with automatic RTL layout
 * - Dark mode support with proper styling
 * 
 * @component
 * @returns {JSX.Element} Profile image upload interface
 * 
 * @example
 * <ProfileImageUpload />
 */

import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import profileService from '@/services/profile.service';
import { getImageUrl } from '@/utils/helpers';
import { validateProfileImage } from '@/utils/profile.validation';
import { toast } from 'react-hot-toast';

/**
 * ProfileImageUpload Component
 * Provides a comprehensive interface for users to upload, preview, and remove
 * their profile image with proper validation and error handling.
 * 
 * Validation Rules:
 * - Maximum file size: 2MB
 * - Allowed formats: JPEG, PNG, WebP
 * 
 * Features:
 * - Drag-and-drop ready UI (click to upload)
 * - Image preview with fallback avatar
 * - Upload progress indication
 * - Remove option for existing images
 * - Base64 storage in database
 * - Internationalization (EN/AR)
 * - Dark mode support
 * - Real-time UI updates on success/failure
 */
export const ProfileImageUpload = () => {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const { t, isRTL } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const profileImageUrl = user?.profile?.profileImage 
    ? getImageUrl(user.profile.profileImage)
    : null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateProfileImage(file);
    if (!validation.isValid) {
      const errorKey = validation.errors.file;
      toast.error(t(errorKey as any));
      return;
    }

    setIsUploading(true);
    try {
      const response = await profileService.uploadProfileImage(file);
      const newProfileImage = response?.data?.profileImage || response?.profileImage;
      
      if (newProfileImage && user) {
        const updatedUser = {
          ...user,
          profile: {
            ...user.profile,
            profileImage: newProfileImage,
          },
        };
        setUser(updatedUser as any);
        setImageFailed(false);
        toast.success(t('profile.photoUpdated'));
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(t('profile.photoFailed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    try {
      setIsUploading(true);
      // Call API to remove the profile image
      await profileService.updateProfile({ profileImage: null });
      
      const updatedUser = {
        ...user,
        profile: {
          ...user.profile,
          profileImage: null,
        },
      };
      setUser(updatedUser as any);
      setImageFailed(false);
      toast.success(t('profile.photoRemoved'));
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error(t('profile.photoRemoveFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
      <h3 className={`text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Camera className="w-5 h-5" />
        {t('profile.uploadPhoto')}
      </h3>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Image Preview */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-blue-600">
            {profileImageUrl && !imageFailed ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <div className={`flex flex-col items-center gap-2 ${isRTL ? 'text-right' : 'text-center'}`}>
              <Upload className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isUploading ? t('loading') : t('profile.uploadPhoto')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG, WebP up to 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`flex gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => !isUploading && fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {t('profile.changePhoto')}
            </button>
            {profileImageUrl && (
              <button
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {t('profile.removePhoto')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Fallback icon component
const User = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);
