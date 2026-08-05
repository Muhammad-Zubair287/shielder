'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateResetPassword } from '@/services/validation/auth.validation';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PASSWORD_REQUIREMENTS } from '@/utils/password';
import { AuthAlert } from '@/components/auth/AuthAlert';

export function ForgotPasswordResetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useLanguage();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('invalidResetLink'));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateResetPassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await authService.resetPasswordWithForgotOtp(token, password);
      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="w-full max-w-sm pt-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">{t('invalidResetLink')}</h2>
            <button
              type="button"
              onClick={() => router.replace('/forgot-password')}
              className="text-[#FF7A1A] hover:underline font-semibold"
            >
              {t('requestNewLink')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="w-full max-w-sm pt-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 text-center">
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('passwordReset')}</h2>
            <p className="text-slate-600 mb-6">{t('redirectingToLogin')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-sm pt-2">
        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="inline-flex items-center gap-2 text-slate-900 font-extrabold tracking-[0.18em] text-xs">
            <span className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px]">S</span>
            <span>SHIELDER</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('resetPassword')}</h1>
          <p className="text-sm text-slate-600 mb-6">{t('enterNewPassword')}</p>

          {error && (
            <AuthAlert type="error" message={error} onDismiss={() => setError('')} className="mb-4" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                {t('newPassword')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
                  dir="ltr"
                  className="input-ltr w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none pr-10 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrengthMeter password={password} showRequirements={true} className="mt-3" />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                  maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
                  dir="ltr"
                  className="input-ltr w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none pr-10 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#004A99] text-white rounded-full font-semibold hover:bg-[#0D2F8C] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? t('processingLoading') : t('resetPassword')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">{t('rememberPassword')}</span>{' '}
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="text-[#004A99] hover:underline font-semibold"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
