'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Lock, 
  LogOut, 
  ChevronDown,
  ShieldCheck,
  Camera,
  Loader2,
  ShoppingBag,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ROUTES } from '@/utils/constants';
import { getImageUrl } from '@/utils/helpers';
import profileService from '@/services/profile.service';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export const ProfileDropdown = () => {
  const { user, logout } = useAuth();
  const { setUser } = useAuthStore();
  const { isRTL, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const popupPositionClasses = (isRTL: boolean) => {
    // For RTL we align the popup to the right and use top-left origin
    if (isRTL) {
      return 'absolute mt-3 w-72 md:w-64 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-secondary/10 dark:border-slate-800 z-[200] overflow-hidden transform origin-top-left animate-in fade-in slide-in-from-top-1 right-4 left-4 md:left-0 md:right-auto';
    }
    // Default LTR alignment (right-aligned on md+)
    return 'absolute mt-3 w-72 md:w-64 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-secondary/10 dark:border-slate-800 z-[200] overflow-hidden transform origin-top-right animate-in fade-in slide-in-from-top-1 left-4 right-4 md:right-0 md:left-auto';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProfileImageFailed(false);
  }, [user?.profile?.profileImage]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      setIsOpen(false);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const getProfileLink = () => {
    if (user?.role === 'SUPER_ADMIN') return '/superadmin/profile';
    if (user?.role === 'ADMIN') return '/admin/profile';
    return '/profile';
  };

  const getChangePasswordLink = () => {
    if (user?.role === 'SUPER_ADMIN') return '/superadmin/profile?tab=security';
    if (user?.role === 'ADMIN') return '/admin/profile?tab=security';
    return '/profile/security';
  };

  const getSettingsLink = () => {
    if (user?.role === 'SUPER_ADMIN') return '/superadmin/settings';
    if (user?.role === 'ADMIN') return '/admin/settings';
    return null;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('profile.photoTooLarge2Mb'));
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('profile.photoTypeInvalid'));
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const data = await profileService.uploadProfileImage(file);
      // Merge the new profileImage into the stored user
      const updatedUser = {
        ...user!,
        profile: { ...user!.profile, profileImage: data?.profileImage ?? data?.data?.profileImage ?? user!.profile?.profileImage },
      };
      setUser(updatedUser as any);
      toast.success(t('profile.photoUpdated'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('profile.photoUploadFailed'));
    } finally {
      setIsUploadingPhoto(false);
      // Reset so same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 md:gap-3 cursor-pointer group hover:bg-secondary/10 dark:hover:bg-white/5 p-1 px-2 rounded-xl transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={`flex flex-col hidden sm:flex ${isRTL ? 'items-start' : 'ltr:items-end'}`}>
          <span className="text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-1 max-w-[120px]">
            {user?.profile?.fullName || 'Super Admin'}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-primary dark:text-[#ff8a5b] font-bold tracking-wider bg-primary/10 dark:bg-white/5 px-1.5 py-0.5 rounded whitespace-nowrap">
              {user?.role === 'SUPER_ADMIN' ? '(Super Admin)' : (user?.role ? `(${user.role.charAt(0) + user.role.slice(1).toLowerCase().replace('_', ' ')})` : '')}
            </span>
          </div>
        </div>
        <div className="relative w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
          {isUploadingPhoto ? (
            <Loader2 size={18} className="animate-spin" />
          ) : user?.profile?.profileImage && !profileImageFailed ? (
            <img 
              src={getImageUrl(user.profile.profileImage) || ''} 
              alt="Profile" 
              className="w-full h-full rounded-xl object-cover"
              onError={() => setProfileImageFailed(true)}
            />
          ) : (
            <User size={20} />
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-secondary dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Hidden file input for photo upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {isOpen && (
        <div className={popupPositionClasses(isRTL)}>
          {/* Header with avatar + change photo */}
          <div className="p-4 bg-secondary/5 dark:bg-slate-900/70 border-b border-secondary/10 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white overflow-hidden">
                  {user?.profile?.profileImage && !profileImageFailed ? (
                    <img
                      src={getImageUrl(user.profile.profileImage) || ''}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={() => setProfileImageFailed(true)}
                    />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  title="Change profile photo"
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary dark:bg-[#ff8a5b] text-white rounded-full flex items-center justify-center shadow hover:bg-primary/80 transition-colors disabled:opacity-60"
                >
                  {isUploadingPhoto ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{user?.profile?.fullName || user?.email}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            {user?.role === 'SUPER_ADMIN' && (
              <p className="text-[10px] text-primary dark:text-[#ff8a5b] font-bold">(Super Admin)</p>
            )}
          </div>

          {/* Links */}
          <div className="p-2">
            {/* Customer-only links */}
            {user?.role === 'USER' && (
              <>
                <Link 
                  href="/my-orders" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 p-3 rounded-xl text-secondary dark:text-slate-300 hover:bg-secondary/10 dark:hover:bg-white/5 hover:text-primary dark:hover:text-[#ff8a5b] transition-colors group"
                >
                  <div className="p-2 bg-secondary/5 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-[#ff8a5b] transition-colors">
                    <ShoppingBag size={18} />
                  </div>
                  <span className="font-semibold">{t('myOrders.title')}</span>
                </Link>
                
                <Link 
                  href="/my-quotations" 
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 p-3 rounded-xl text-secondary dark:text-slate-300 hover:bg-secondary/10 dark:hover:bg-white/5 hover:text-primary dark:hover:text-[#ff8a5b] transition-colors group"
                >
                  <div className="p-2 bg-secondary/5 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-[#ff8a5b] transition-colors">
                    <FileText size={18} />
                  </div>
                  <span className="font-semibold">{t('myQuotations.title')}</span>
                </Link>

                <div className="border-t border-gray-100 dark:border-slate-800 my-1"></div>
              </>
            )}

            <Link 
              href={getProfileLink()} 
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 p-3 rounded-xl text-secondary dark:text-slate-300 hover:bg-secondary/10 dark:hover:bg-white/5 hover:text-primary dark:hover:text-[#ff8a5b] transition-colors group"
            >
              <div className="p-2 bg-secondary/5 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-[#ff8a5b] transition-colors">
                <User size={18} />
              </div>
              <span className="font-semibold">{t('profile.title')}</span>
            </Link>

            <Link 
              href={getChangePasswordLink()} 
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 p-3 rounded-xl text-secondary dark:text-slate-300 hover:bg-secondary/10 dark:hover:bg-white/5 hover:text-primary dark:hover:text-[#ff8a5b] transition-colors group"
            >
              <div className="p-2 bg-secondary/5 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-[#ff8a5b] transition-colors">
                <Lock size={18} />
              </div>
              <span className="font-semibold">{t('changePassword')}</span>
            </Link>

            {getSettingsLink() && (
              <Link 
                href={getSettingsLink()!} 
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl text-secondary dark:text-slate-300 hover:bg-secondary/10 dark:hover:bg-white/5 hover:text-primary dark:hover:text-[#ff8a5b] transition-colors group"
              >
                <div className="p-2 bg-secondary/5 dark:bg-white/5 rounded-lg group-hover:bg-primary/10 dark:group-hover:bg-white/10 group-hover:text-primary dark:group-hover:text-[#ff8a5b] transition-colors">
                  <Settings size={18} />
                </div>
                <span className="font-semibold">{t('settings')}</span>
              </Link>
            )}
          </div>

          {/* Footer / Logout */}
          <div className="p-2 border-t border-gray-100 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex items-center space-x-3 w-full p-3 rounded-xl text-critical-500 dark:text-red-300 hover:bg-critical-50 dark:hover:bg-red-950/35 transition-colors group ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="p-2 bg-critical-100 dark:bg-red-950/50 rounded-lg group-hover:bg-critical-500 group-hover:text-white transition-colors text-critical-600 dark:text-red-300">
                <LogOut size={18} />
              </div>
              <span className="font-bold">{isLoggingOut ? 'Logging out...' : t('logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
