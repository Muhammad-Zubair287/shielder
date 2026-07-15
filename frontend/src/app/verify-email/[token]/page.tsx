'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const tokenParam = params.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [state, setState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Prevent double-call from React Strict Mode or dependency re-runs.
  const calledRef = useRef(false);
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setErrorMessage(t('invalidVerificationLink'));
      setState('error');
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => {
        setState('success');
        setTimeout(() => routerRef.current.replace('/login'), 3000);
      })
      .catch((err: unknown) => {
        const msg =
          typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          typeof (err as { message?: string }).message === 'string'
            ? (err as { message: string }).message
            : t('verificationFailedMessage');
        setErrorMessage(msg);
        setState('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">

        {state === 'loading' && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('verifyingEmail')}</h2>
            <p className="text-slate-600">{t('pleaseWait')}</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('emailVerified')}</h2>
            <p className="text-slate-600 mb-2">{t('redirectingToLogin')}</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">{t('verificationFailed')}</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            <Link href="/login" replace className="text-blue-600 hover:underline font-semibold">
              {t('backToLogin')}
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
