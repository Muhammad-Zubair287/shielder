"use client";
import settingsService from '@/services/settings.service';
/**
 * Login Page
 * User login form with Arabic/English support
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ChevronLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES, VALIDATION_RULES, STORAGE_KEYS } from '@/utils/constants';
import type { LoginRequest } from '@/types';
import toast from 'react-hot-toast';

export default function LoginPage() {
    // Use static logo for login page (public, no API call)
    const companyLogo = null; // or set to "/images/company-logo.png" if you have a static logo

    // Clear auth state if session expired
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('expired')) {
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
        // Also clear legacy localStorage tokens
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        try {
          const { useAuthStore } = require('@/store/auth.store');
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setError(null);
          useAuthStore.getState().setLoading(false);
        } catch (e) {}
      }
    }, []);
  const { login, isSubmitting } = useAuth();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL, locale, setLocale } = useLanguage();

  const expired = searchParams.get('expired');

  // Show session expired alert
  useEffect(() => {
    if (expired) {
      toast.error('Session Expired: Please log in again to continue.', {
        id: 'session-expired',
      });
    }
  }, [expired]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'SUPER_ADMIN') {
        router.push(ROUTES.SUPER_ADMIN_DASHBOARD);
      } else if (user.role === 'ADMIN') {
        router.push(ROUTES.ADMIN_DASHBOARD);
      } else {
        router.push(ROUTES.CUSTOMER_DASHBOARD);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginRequest>>({});
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Partial<LoginRequest> = {};

    if (!formData.email) {
      newErrors.email = t('emailRequired');
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = t('invalidEmail');
    }

    if (!formData.password) {
      newErrors.password = t('passwordRequired');
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
      await login(formData);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginRequest]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 p-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Container */}
      <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row w-full max-w-[1200px] shadow-2xl min-h-[600px]">
        
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

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col relative bg-white">
          {/* Back Button */}
          <Link href={ROUTES.HOME} className={`absolute top-8 ${isRTL ? 'right-8' : 'left-8'} text-gray-400 hover:text-gray-700 transition-colors`}>
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-sm font-medium text-gray-500 hover:text-gray-700`}
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>

          <div className="my-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
              {t('loginYourAccount')}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('email')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Mail className="w-5 h-5" />
                  </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@gmail.com"
                        autoComplete="email"
                        className={`w-full py-3.5 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} bg-white border rounded-xl outline-none transition-all ${
                          errors.email ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                        }`}
                      />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {t('password')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Lock className="w-5 h-5" />
                  </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={`w-full py-3.5 ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} bg-white border rounded-xl outline-none transition-all ${
                          errors.password ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 ${isRTL ? 'left-4' : 'right-4'} flex items-center text-gray-400 hover:text-gray-600 transition-colors`}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.password}</p>
                )}
                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <Link 
                    href="#" 
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-8 bg-[#FF6B35] hover:bg-[#FF5722] text-white font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? t('loading') || 'Loading...' : 'Continue'}
                  </button>
            </form>

            <div className="mt-8 text-center text-gray-600">
              <p className="text-sm">
                {t('dontHaveAccount')}{' '}
                <a
                  href="#"
                  className="text-[#FF6B35] font-semibold hover:text-[#FF5722] transition-colors"
                  onClick={e => {
                    e.preventDefault();
                    // Remove ?expired from URL before navigating
                    const url = ROUTES.REGISTER;
                    window.location.href = url;
                  }}
                >
                  {t('signUp')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

