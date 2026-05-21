"use client";
/**
 * Login Page
 * User login form with Arabic/English support
 */

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES, VALIDATION_RULES, STORAGE_KEYS } from '@/utils/constants';
import type { LoginRequest } from '@/types';
import toast from 'react-hot-toast';
import { validateLoginForm } from '@/services/validation.service';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PASSWORD_REQUIREMENTS } from '@/utils/password';
import authService from '@/services/auth.service';

const LOGIN_TOAST_DURATION_MS = 4000;

function LoginPageContent() {
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
        import('@/store/auth.store').then(({ useAuthStore }) => {
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setError(null);
          useAuthStore.getState().setLoading(false);
        }).catch(() => {
          // no-op: best-effort cleanup only
        });
      } catch {
        // no-op: best-effort cleanup only
      }
    }
  }, []);
  const { login, isSubmitting } = useAuth();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL, locale, setLocale } = useLanguage();
  const redirectHandled = useRef(false);

  const prefetchedRoutes = useRef(new Set<string>());

  const prefetchRoute = useCallback((href: string) => {
    if (prefetchedRoutes.current.has(href)) return;
    prefetchedRoutes.current.add(href);
    router.prefetch(href);
  }, [router]);

  // Warm only the most likely destinations after the form has mounted.
  useEffect(() => {
    const routes = ['/superadmin/dashboard', '/admin/dashboard', '/customer/dashboard'];
    const timer = window.setTimeout(() => routes.forEach(prefetchRoute), 500);
    return () => window.clearTimeout(timer);
  }, [prefetchRoute]);

  const expired = searchParams.get('expired');

  // Show session expired alert
  useEffect(() => {
    if (expired) {
      toast.error(t('auth.sessionExpiredContinue'), {
        id: 'session-expired',
        duration: LOGIN_TOAST_DURATION_MS,
      });
    }
  }, [expired, t]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (redirectHandled.current) return;
      redirectHandled.current = true;
      if (user.role === 'SUPER_ADMIN') {
        router.push(ROUTES.SUPER_ADMIN_DASHBOARD);
      } else if (user.role === 'ADMIN') {
        router.push(ROUTES.ADMIN_DASHBOARD);
      } else {
        // Use stored redirect destination, fall back to /products
        const dest =
          sessionStorage.getItem('post_login_redirect') ||
          sessionStorage.getItem('checkout_redirect') ||
          '/products';
        sessionStorage.removeItem('post_login_redirect');
        sessionStorage.removeItem('checkout_redirect');
        router.push(dest);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginRequest>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [trustedDeviceMessage, setTrustedDeviceMessage] = useState<string | null>(null);

  useEffect(() => {
    if (showResendVerification) {
      prefetchRoute('/forgot-password');
    }
  }, [showResendVerification, prefetchRoute]);

  useEffect(() => {
    let isMounted = true;

    const checkTrustedDevice = async () => {
      try {
        const status = await authService.getTrustedDeviceStatus();
        if (!isMounted) return;

        if (status.trusted) {
          setTrustedDeviceMessage(t('auth.deviceAlreadyTrusted'));
        } else {
          setTrustedDeviceMessage(null);
        }
      } catch {
        if (!isMounted) return;
        setTrustedDeviceMessage(null);
      }
    };

    checkTrustedDevice();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const isUnverifiedEmailError = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('verify your email') ||
      normalized.includes('email not verified')
    );
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Partial<LoginRequest> = {};
    const validationErrors = validateLoginForm(formData);

    validationErrors.forEach((err) => {
      if (err.field === 'email') {
        newErrors.email = !formData.email ? t('emailRequired') : t('invalidEmail');
      }
      if (err.field === 'password') {
        newErrors.password = t('passwordRequired');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    redirectHandled.current = true;
    try {
      setShowResendVerification(false);
      await login(formData);
    } catch (error: unknown) {
      redirectHandled.current = false;
      const message = error instanceof Error ? error.message : '';
      setShowResendVerification(isUnverifiedEmailError(message));
      console.error('Login error:', error);
    }
  };

  const handleResendVerification = async () => {
    const email = formData.email?.trim();
    if (!email) {
      toast.error(t('auth.enterEmailFirst'), { duration: LOGIN_TOAST_DURATION_MS });
      return;
    }

    if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
      toast.error(t('invalidEmail'), { duration: LOGIN_TOAST_DURATION_MS });
      return;
    }

    try {
      setIsResendingVerification(true);
      await authService.resendVerificationEmail(email);
      toast.success(t('auth.verificationResentIfUnverified'), { duration: LOGIN_TOAST_DURATION_MS });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.resendVerificationFailed');
      toast.error(message, { duration: LOGIN_TOAST_DURATION_MS });
    } finally {
      setIsResendingVerification(false);
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
    <div className={`login-page-shell min-h-screen flex items-center justify-center bg-gray-50 p-4 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-[1200px]">
        {/* Rotated panel behind main login card to match Figma composition */}
        <div className="absolute inset-1 md:inset-2 rounded-[2rem] bg-[#0A1E36] rotate-[-2.7deg] shadow-[0_24px_60px_rgba(10,30,54,0.35)]" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col md:flex-row w-full min-h-[600px]">
        
        {/* Left Side - Background Image */}
        <div className="w-full md:flex-[0_0_56%] relative overflow-hidden rounded-[2rem] md:rounded-[2rem_0_0_2rem] shadow-2xl">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image 
              src="/images/login image new download.jpg" 
              alt="Shielder Construction" 
              fill
              className="object-cover"
              sizes="50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/35"></div>
          </div>

          {/* Content Overlay */}
          <div className="relative z-10 h-full min-h-[600px] flex flex-col justify-end p-6 md:p-8">
            {/* Logo sits directly on the image like the Figma reference */}
            <div className="absolute top-5 left-5">
              <Image 
                src="/images/shielder image.png" 
                alt="Shielder Logo" 
                width={150}
                height={64}
                className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] object-contain"
                style={{ width: 'auto', height: 'auto' }}
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
        <div className="w-full md:flex-[0_0_46%] md:-ml-14 relative bg-white rounded-[2rem] shadow-2xl md:rounded-[2rem] p-8 md:p-12 flex flex-col md:min-h-[600px]">
          {/* Back Button */}
          <button
            onClick={() => window.history.length > 1 ? router.back() : router.push(ROUTES.HOME)}
            className={`absolute top-5 z-10 ${isRTL ? 'right-8' : 'left-8'} inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors`}
            aria-label={isRTL ? 'Back to previous page' : 'Back to previous page'}
          >
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
            <span>{t('back')}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-sm font-medium text-gray-500 hover:text-gray-700`}
            aria-label="Switch language"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>

          <div className="my-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-10">
              {t('loginYourAccount')}
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Secure sign in protected with encrypted sessions, account lockout, and role-based access controls.
            </p>

            {trustedDeviceMessage && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {trustedDeviceMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                  {t('email')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Mail className="w-5 h-5" />
                  </div>
                      <input
                        id="login-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onFocus={() => prefetchRoute('/forgot-password')}
                        placeholder="example@gmail.com"
                        autoComplete="email"
                        className={`w-full py-3.5 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl outline-none transition-all shadow-sm ${
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
                <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                  {t('password')}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF6B35] transition-colors`}>
                    <Lock className="w-5 h-5" />
                  </div>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        onFocus={() => prefetchRoute('/forgot-password')}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
                        className={`w-full py-3.5 ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl outline-none transition-all shadow-sm ${
                          errors.password ? 'border-red-500' : 'border-gray-300 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute inset-y-0 ${isRTL ? 'left-4' : 'right-4'} flex items-center text-gray-400 hover:text-gray-600 transition-colors`}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.password}</p>
                )}
                <PasswordStrengthMeter password={formData.password} showRequirements={false} className="mt-2" />
                <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <Link 
                    href="/forgot-password" 
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

              {showResendVerification && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification || isSubmitting}
                  className="w-full mt-3 border border-[#FF6B35] text-[#FF6B35] hover:bg-[#FFF2EC] font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResendingVerification ? 'Sending verification email...' : 'Resend verification email'}
                </button>
              )}
            </form>

            <div className="mt-8 text-center text-gray-600">
              <p className="text-sm">
                {t('dontHaveAccount')}{' '}
                <Link
                  href={ROUTES.REGISTER}
                  className="text-[#FF6B35] font-semibold hover:text-[#FF5722] transition-colors"
                >
                  {t('signUp')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

