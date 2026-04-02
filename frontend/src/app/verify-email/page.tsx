'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError(t('auth.invalidVerificationLink'));
        setLoading(false);
        return;
      }

      try {
        await authService.verifyEmail(token);
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || t('auth.errors.verificationFailed'));
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, t, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.verifyingEmail')}</h2>
          <p className="text-slate-600">{t('auth.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.emailVerified')}</h2>
          <p className="text-slate-600 mb-6">{t('auth.redirectingToLogin')}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('auth.goToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{t('auth.verificationFailed')}</h2>
        <p className="text-slate-600 mb-6">{error || t('auth.errors.verificationFailed')}</p>
        <div className="space-y-2">
          <Link
            href="/login"
            className="block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('auth.backToLogin')}
          </Link>
          <Link
            href="/"
            className="block px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
          >
            {t('auth.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
