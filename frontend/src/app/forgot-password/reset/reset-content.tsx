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
  const { t } = useLanguage();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('invalid Reset Link'));
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
      setError(err instanceof Error ? err.message : t(' reset Failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-sm pt-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">{t('invalid Reset Link')}</h2>
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
      <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center">
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
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-sm pt-2">
        <div className="mb-6 text-left">
          <div className="inline-flex items-center gap-2 text-slate-900 font-extrabold tracking-[0.18em] text-xs">
            <span className="w-7 h-7 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px]">S</span>
            <span>SHIELDER</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('resetPassword')}</h1>
          <p className="text-sm text-slate-600 mb-6">{t('enter New Password')}</p>

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
                  className="w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none pr-10 text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <PasswordStrengthMeter password={password} showRequirements={true} className="mt-3" />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                {t('confirm Password')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirm Password ')}
                maxLength={PASSWORD_REQUIREMENTS.MAX_LENGTH}
                className="w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none text-sm"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#004A99] text-white rounded-full font-semibold hover:bg-[#0D2F8C] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? t('processingLoading') : t('Reset Password')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">{t('remember Password')}</span>{' '}
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="text-[#FF7A1A] hover:underline font-semibold"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}