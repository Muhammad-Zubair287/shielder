'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateForgotPasswordEmail } from '@/services/validation/auth.validation';
import { AuthAlert } from '@/components/auth/AuthAlert';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : t('errors.forgot Password Failed');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white px-4 py-8 flex items-start justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
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
                dir="ltr"
                className="input-ltr w-full h-11 px-4 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-sm"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
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
