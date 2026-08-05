'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { LockoutError } from '@/services/api.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateForgotPasswordEmail } from '@/services/validation/auth.validation';
import { AuthAlert } from '@/components/auth/AuthAlert';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      setLockSecondsLeft(left);
      if (left === 0) setLockedUntil(null);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const lockMinutesLeft = Math.ceil(lockSecondsLeft / 60);
  const isLocked = lockSecondsLeft > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || loading) return;
    setError('');
    setLoading(true);
    try {
      const validationError = validateForgotPasswordEmail(email);
      if (validationError) {
        setError(validationError);
        return;
      }
      await authService.sendForgotPasswordOtp(email);
      router.replace(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      if (err instanceof LockoutError) {
        setLockedUntil(new Date(err.lockedUntil));
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : t('errors.forgotPasswordFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white px-4 py-8 flex items-start justify-center"
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
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('forgotPassword')}</h1>
          <p className="text-sm text-slate-600 mb-6">{t('enterEmailToReset')}</p>

          {error && (
            <AuthAlert type="error" message={error} onDismiss={() => setError('')} className="mb-4" />
          )}

          {isLocked && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-center">
              {t('auth.otpLockoutCountdown').replace('{{minutes}}', String(lockMinutesLeft))}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('enterEmail')}
                maxLength={254}
                dir="ltr"
                className="input-ltr w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                disabled={loading || isLocked}
              />
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full h-11 bg-[#004A99] text-white rounded-full font-semibold hover:bg-[#0D2F8C] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? t('sending') : t('submit')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">{t('rememberPassword')}</span>{' '}
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="text-[#004A99] hover:underline font-semibold"
            >
              {t('backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
