'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError(t('invalidVerificationLink'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await authService.verifyEmail(token);
        setSuccess(true);
        setTimeout(() => router.replace('/login'), 3000);
      } catch (err: unknown) {
        const message =
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
            'string'
            ? (err as { response: { data: { message: string } } }).response.data.message
            : t('errors.verificationFailed');
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, t, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {loading && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('verifyingEmail')}</h2>
            <p className="text-slate-600">{t('pleaseWait')}</p>
          </>
        )}

        {success && !loading && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('emailVerified')}</h2>
            <p className="text-slate-600 mb-6">{t('redirectingToLogin')}</p>
          </>
        )}

        {error && !loading && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">{t('verificationFailed')}</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link href="/login" className="text-blue-600 hover:underline font-semibold">
              {t('backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
