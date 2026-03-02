"use client";
/**
 * Register Page
 * User registration form with Arabic/English support
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ChevronLeft, Shield, User, Phone, Building2, MapPin, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES, VALIDATION_RULES, LOCALES, STORAGE_KEYS } from '@/utils/constants';
import type { RegisterRequest } from '@/types';

export default function RegisterPage() {
  // Company logo is not fetched here to avoid triggering protected API endpoints
  // for unauthenticated users (which would cause a false 'Session Expired' redirect).
  const companyLogo = null;
  const { register, isSubmitting } = useAuth();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL, locale, setLocale } = useLanguage();

  // Only redirect if authenticated, do not redirect unauthenticated users
  useEffect(() => {
    // Only run redirect logic after loading is complete
    if (isLoading) return;
    const pathname = window.location.pathname;
    // If ?expired is present, do not redirect
    const search = window.location.search;
    if (search.includes('expired')) return;
    if (isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        router.replace(ROUTES.SUPER_ADMIN_DASHBOARD);
      } else if (user.role === 'ADMIN') {
        router.replace(ROUTES.ADMIN_DASHBOARD);
      } else {
        router.replace(ROUTES.CUSTOMER_DASHBOARD);
      }
    } else if (isAuthenticated === false && pathname === ROUTES.REGISTER) {
      // Stay on register page
      return;
    } else if (isAuthenticated === false && pathname !== ROUTES.REGISTER) {
      // Only redirect if not already on login or register
      if (pathname !== ROUTES.LOGIN && pathname !== ROUTES.REGISTER) {
        router.replace(ROUTES.LOGIN);
      }
      // If on register, do nothing (stay on page)
      return;
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show session expired alert if redirected from login
  useEffect(() => {
    const expired = searchParams.get('expired');
    if (expired) {
      // Show toast or alert
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Session Expired: Please log in again to continue.', {
          id: 'session-expired-signup',
        });
      });
    }
  }, [searchParams]);

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    address: '',
    companyName: '',
    preferredLanguage: locale,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterRequest | 'confirmPassword', string>>>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterRequest | 'confirmPassword', string>> = {};

    if (!formData.email) {
      newErrors.email = t('emailRequired');
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = t('invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
    } else if (!VALIDATION_RULES.PASSWORD_REGEX.test(formData.password)) {
      newErrors.password = t('passwordMinLength');
    }

    if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = t('passwordMismatch');
    }

    if (!formData.fullName) {
      newErrors.fullName = t('nameRequired');
    }

    if (!formData.address) {
      newErrors.address = t('addressRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const result = await register({ ...formData, preferredLanguage: locale });
      // Debug: Check localStorage and Zustand state
      const accessToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
      console.log('Registration result:', result);
      console.log('AccessToken:', accessToken);
      console.log('RefreshToken:', refreshToken);
      console.log('User:', userStr);
      if (!accessToken || !refreshToken || !userStr) {
        alert('Registration succeeded but authentication data is missing. Please check backend response and sessionStorage logic.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed: ' + (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)));
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterRequest]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 p-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Container */}
      <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row w-full max-w-[1200px] shadow-2xl min-h-[650px]">
        
        {/* Left Side - Background Image */}
        <div className="w-full md:w-1/2 relative">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image 
              src="/images/login image new download.jpg" 
              alt="Shielder Construction" 
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30"></div>
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-8">
            {/* Logo — pinned to top-left corner */}
            <div className="absolute top-5 left-5">
              <Image 
                src="/images/shielder image.png" 
                alt="Shielder Logo" 
                width={160}
                height={70}
                className="drop-shadow-2xl object-contain"
              />
            </div>

            {/* Welcome Card at Bottom */}
            <div className="space-y-4">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 max-w-xs">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
                  Welcome to the Shielder
                  <br />
                  Login to explore
                </h2>
              </div>
              
              {/* Pagination Dots */}
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-900"></div>
                <div className="w-2 h-2 rounded-full bg-[#FF6B35]"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col relative bg-white overflow-y-auto">
          {/* Back Button */}
          <Link href={ROUTES.LOGIN} className={`absolute top-8 ${isRTL ? 'right-8' : 'left-8'} text-gray-400 hover:text-gray-700 transition-colors`}>
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-sm font-medium text-gray-500 hover:text-gray-700`}
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>

          <div className="my-auto pt-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {t('createAccount')}
            </h1>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('name')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={t('enterName')}
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border rounded-xl outline-none transition-all ${errors.fullName ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('email')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@mail.com"
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border rounded-xl outline-none transition-all ${errors.email ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('phone')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+966 ..."
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border rounded-xl outline-none transition-all ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                </div>
              </div>

              {/* Company */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('company')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder={t('enterCompany')}
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border rounded-xl outline-none transition-all border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]`}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('address')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder={t('enterAddress')}
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} bg-white border rounded-xl outline-none transition-all ${errors.address ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                </div>
                {errors.address && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.address}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('password')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} bg-white border rounded-xl outline-none transition-all ${errors.password ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute inset-y-0 ${isRTL ? 'left-4' : 'right-4'} flex items-center text-gray-400 hover:text-gray-600 transition-colors`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {t('confirmPassword')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-3 ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} bg-white border rounded-xl outline-none transition-all ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute inset-y-0 ${isRTL ? 'left-4' : 'right-4'} flex items-center text-gray-400 hover:text-gray-600 transition-colors`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-6 bg-[#FF6B35] hover:bg-[#FF5722] text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? t('loading') : 'Continue'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-gray-600">
              <p className="text-sm">
                {t('alreadyHaveAccount')}{' '}
                <Link href={ROUTES.LOGIN} className="text-[#FF6B35] font-semibold hover:text-[#FF5722] transition-colors">
                  {t('signIn')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

