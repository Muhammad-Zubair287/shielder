'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Phone, 
  Building2, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera
} from 'lucide-react';
import authService from '@/services/auth.service';
import profileService from '@/services/profile.service';
import { handleApiError } from '@/services/api.service';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '@/utils/helpers';
import { useLanguage } from '@/contexts/LanguageContext';

type TabType = 'overview' | 'security';

export default function ProfilePage() {
  const { t, isRTL } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);

  // Password change state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      if (tab === 'security') setActiveTab('security');
    }
  }, []);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [user?.profile?.profileImage]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setError(null);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should not exceed 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      await profileService.uploadProfileImage(file);
      
      // Refresh user data to update navbar
      await refreshUser();
      
      toast.success('Profile image updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('profileOverview')}
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {t('profileSecurityTab')}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-shielder-dark to-shielder-primary relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg relative group">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-shielder-dark relative overflow-hidden">
                {user?.profile?.profileImage && getImageUrl(user.profile.profileImage) && !profileImageFailed ? (
                  <img
                    src={getImageUrl(user.profile.profileImage) || ''}
                    alt="Profile"
                    className="w-full h-full rounded-xl object-cover"
                    onError={() => setProfileImageFailed(true)}
                  />
                ) : (
                  <User size={40} />
                )}
                {/* Upload Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
                >
                  {uploadingImage ? (
                    <Loader2 className="text-white animate-spin" size={24} />
                  ) : (
                    <Camera className="text-white" size={24} />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-8 px-8">
          {activeTab === 'overview' ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{user?.profile?.fullName || 'Super Admin'}</h1>
                  <p className="text-gray-500 font-medium">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-shielder-primary/10 text-shielder-primary text-xs font-bold rounded-full uppercase tracking-widest">
                    {user?.role?.replace('_', ' ') || 'Full Access'}
                  </span>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Info */}
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={20} className="text-shielder-primary" />
                    Account Information
                  </h2>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Mail className="text-gray-400" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                        <p className="text-sm font-semibold text-gray-800">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Shield className="text-gray-400" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</p>
                        <p className="text-sm font-semibold text-gray-800">{user?.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Calendar className="text-gray-400" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member Since</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <User size={20} className="text-shielder-primary" />
                    Personal Details
                  </h2>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Phone className="text-gray-400" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone Number</p>
                        <p className="text-sm font-semibold text-gray-800">{user?.profile?.phoneNumber || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <Building2 className="text-gray-400" size={18} />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</p>
                        <p className="text-sm font-semibold text-gray-800">{user?.profile?.companyName || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="max-w-md">
              <h2 className="text-2xl font-black text-gray-900 mb-2">Security Settings</h2>
              <p className="text-gray-500 font-medium mb-8 text-sm">Update your account credentials to keep your profile secure.</p>
              
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Current Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, currentPassword: e.target.value});
                        if (error) setError(null);
                      }}
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-shielder-primary/20 focus:bg-white transition-all text-sm font-semibold"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      {showPassword ? <EyeOff size={18} className="text-gray-400" /> : <Eye size={18} className="text-gray-400" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, newPassword: e.target.value});
                        if (error) setError(null);
                      }}
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-shielder-primary/20 focus:bg-white transition-all text-sm font-semibold"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 px-1">
                    Min. 8 characters, at least one uppercase, lowercase, number and special character.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, confirmPassword: e.target.value});
                        if (error) setError(null);
                      }}
                      className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-shielder-primary/20 focus:bg-white transition-all text-sm font-semibold"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#FF6B35] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#FF5722] transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {isSubmitting ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
