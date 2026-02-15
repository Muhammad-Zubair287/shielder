/**
 * Login Page
 * User login form with Arabic/English support
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, ChevronLeft, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { ROUTES, VALIDATION_RULES } from '@/utils/constants';
import type { LoginRequest } from '@/types';

export default function LoginPage() {
  const { login, isSubmitting } = useAuth();
  const { t, isRTL, locale, setLocale } = useLanguage();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginRequest>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Partial<LoginRequest> = {};

    if (!formData.email) {
      newErrors.email = t.emailRequired;
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(formData.email)) {
      newErrors.email = t.invalidEmail;
    }

    if (!formData.password) {
      newErrors.password = t.passwordRequired;
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
    <div className={`min-h-screen flex items-center justify-center bg-shielder-dark p-4 md:p-8 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row w-full max-w-6xl shadow-2xl min-h-[600px]">
        {/* Left Side: Illustration/Image */}
        <div className="w-full md:w-1/2 relative bg-gradient-to-br from-white to-blue-50 p-8 flex flex-col justify-between overflow-hidden">
          <div className="z-10">
            <div className="flex items-center gap-2 mb-12">
              <Shield className="w-10 h-10 text-shielder-dark" />
              <span className="text-3xl font-bold tracking-wider text-shielder-dark">SHIELDER</span>
            </div>
            
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-shielder-accent/10 rounded-full blur-3xl"></div>
              <div className="absolute top-40 right-0 w-48 h-48 bg-shielder-dark/5 rounded-full blur-2xl"></div>
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-bold text-shielder-dark mb-4 leading-tight">
              {t.welcomeToShielder}
              <br />
              <span className="text-shielder-accent">{t.loginToExplore}</span>
            </h2>
            
            {/* Carousel Indicators */}
            <div className="flex gap-2 mt-8">
              <div className="w-2 h-2 rounded-full bg-shielder-accent"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-8 h-2 rounded-full bg-shielder-accent/30"></div>
            </div>
          </div>

          {/* Abstract Image Background */}
          <div className="absolute inset-0 z-0 opacity-40">
            <Image 
              src="/images/login-image.png" 
              alt="Decorative background" 
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col relative bg-white">
          {/* Back Button */}
          <Link href={ROUTES.HOME} className={`absolute top-8 ${isRTL ? 'right-8' : 'left-8'} text-gray-400 hover:text-shielder-dark transition-colors`}>
            <ChevronLeft className={`w-6 h-6 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>

          {/* Language Switcher */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} text-sm font-medium text-shielder-accent hover:underline`}
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>

          <div className="my-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-shielder-dark mb-12">
              {t.loginYourAccount}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-shielder-dark ml-1">
                  {t.email}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-shielder-accent transition-colors`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="hassanumar@gmail.com"
                    autoComplete="email"
                    className={`w-full py-4 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} bg-white border-2 rounded-full outline-none transition-all ${
                      errors.email ? 'border-red-500' : 'border-gray-200 focus:border-shielder-accent'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1 ml-4">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-shielder-dark ml-1">
                  {t.password}
                </label>
                <div className="relative group">
                  <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-gray-400 group-focus-within:text-shielder-accent transition-colors`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`w-full py-4 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} bg-white border-2 rounded-full outline-none transition-all ${
                      errors.password ? 'border-red-500' : 'border-gray-200 focus:border-shielder-accent'
                    }`}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 ml-4">{errors.password}</p>
                )}
                <div className="flex justify-end pr-2">
                  <Link href="#" className="text-sm text-gray-500 hover:text-shielder-dark transition-colors">
                    {t.forgotPassword}?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-shielder-accent hover:bg-shielder-accent/90 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-shielder-accent/20 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-8"
              >
                {isSubmitting ? t.loading : t.continue}
              </button>
            </form>

            <div className="mt-8 text-center text-gray-500">
              <p>
                {t.dontHaveAccount}{' '}
                <Link href={ROUTES.REGISTER} className="text-shielder-accent font-bold hover:underline">
                  {t.signUp}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

