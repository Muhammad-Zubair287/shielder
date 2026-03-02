'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
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
import { useAuthStore } from '@/store/auth.store';
import { getImageUrl } from '@/utils/helpers';

type TabType = 'overview' | 'security';

export default function ProfilePage() {
  const { user } = useAuth();
  const { setUser } = useAuthStore();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    searchParams.get('tab') === 'security' ? 'security' : 'overview'
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Password change state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Sync tab when URL param changes (e.g. navigating from navbar)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'security') setActiveTab('security');
    else if (!tab) setActiveTab('overview');
  }, [searchParams]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG or WebP files are allowed');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const data = await profileService.uploadProfileImage(file);
      const newImg = data?.profileImage ?? data?.data?.profileImage ?? data?.user?.profile?.profileImage;
      if (user && newImg) {
        setUser({ ...user, profile: { ...user.profile, profileImage: newImg } } as any);
      }
      toast.success('Profile photo updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Security & Password
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-shielder-dark to-shielder-primary relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-shielder-dark relative">
                {user?.profile?.profileImage ? (
                  <Image src={getImageUrl(user.profile.profileImage) || user.profile.profileImage} alt="Profile" className="rounded-xl object-cover" fill />
                ) : (
                  <User size={40} />
                )}
                {/* Upload overlay */}
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  title="Change profile photo"
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                >
                  {isUploadingPhoto
                    ? <Loader2 size={22} className="animate-spin text-white" />
                    : <Camera size={22} className="text-white" />
                  }
                </button>
              </div>
            </div>
            {/* Hidden file input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* Content */}
        <div className="pt-16 pb-8 px-8">
          {activeTab === 'overview' ? (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{user?.profile?.fullName || 'Admin'}</h1>
                  <p className="text-gray-500 font-medium">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-1.5 bg-shielder-primary/10 text-shielder-primary text-xs font-bold rounded-full uppercase tracking-widest">
                    {user?.role?.replace('_', ' ') || 'Admin Access'}
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
                  className="w-full bg-shielder-dark text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-shielder-primary transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
