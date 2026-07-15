'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { VALIDATION_RULES } from '@/utils/constants';

type VerifyState = 'loading' | 'success' | 'error' | 'otp';

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useLanguage();
  const token = searchParams.get('token');
  const mode = searchParams.get('mode');
  const sessionFromQuery = searchParams.get('session');
  const emailFromQuery = searchParams.get('email');

  const [verifyState, setVerifyState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationSessionToken, setVerificationSessionToken] = useState(sessionFromQuery || '');
  const [verificationEmail, setVerificationEmail] = useState(emailFromQuery || '');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Prevent double-call from React Strict Mode.
  const calledRef = useRef(false);
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (mode === 'otp') {
      if (!verificationSessionToken || !verificationEmail) {
        setErrorMessage(t('auth.verificationSessionInvalid'));
        setVerifyState('error');
      } else {
        setVerifyState('otp');
      }
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setErrorMessage(t('invalidVerificationLink'));
      setVerifyState('error');
      return;
    }

    authService
      .verifyEmail(token)
      .then(() => {
        setVerifyState('success');
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
        setVerifyState('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationSessionToken) {
      setErrorMessage(t('auth.verificationSessionInvalid'));
      setVerifyState('error');
      return;
    }

    if (!/^\d{6}$/.test(otpCode)) {
      setErrorMessage(t('auth.otpSixDigits'));
      setVerifyState('error');
      return;
    }

    try {
      setVerifyState('otp');
      setIsSubmittingOtp(true);
      await authService.verifyEmailOtp(verificationSessionToken, otpCode);
      setVerifyState('success');
      setTimeout(() => routerRef.current.replace('/login'), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('verificationFailedMessage');
      setErrorMessage(msg);
      setVerifyState('error');
      setOtpCode('');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationSessionToken) {
      setErrorMessage(t('auth.verificationSessionInvalid'));
      setVerifyState('error');
      return;
    }

    try {
      setIsResendingOtp(true);
      await authService.resendEmailOtp(verificationSessionToken);
      toast.success(t('auth.otpResendSuccess') || 'OTP sent successfully to your email');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.resendVerificationFailed');
      setErrorMessage(msg);
      setVerifyState('error');
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationSessionToken) {
      setErrorMessage(t('auth.verificationSessionInvalid'));
      setVerifyState('error');
      return;
    }

    if (!VALIDATION_RULES.EMAIL_REGEX.test(newEmail.trim())) {
      setErrorMessage(t('invalidEmail'));
      setVerifyState('error');
      return;
    }

    try {
      setIsChangingEmail(true);
      const result = await authService.changeVerificationEmail(
        verificationSessionToken,
        newEmail.trim()
      );

      setVerificationSessionToken(result.verificationSessionToken);
      setVerificationEmail(result.verificationEmail);
      setShowEmailChange(false);
      setNewEmail('');
      setVerifyState('otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('auth.changeEmailFailed');
      setErrorMessage(msg);
      setVerifyState('error');
    } finally {
      setIsChangingEmail(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">

        {verifyState === 'loading' && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('verifyingEmail')}</h2>
            <p className="text-slate-600">{t('pleaseWait')}</p>
          </>
        )}

        {verifyState === 'success' && (
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

        {verifyState === 'otp' && (
          <>
            <div className="mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-9 13V12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('auth.verifyEmailTitle')}</h2>
            <p className="text-slate-600 mb-4">
              {t('auth.verificationCodeSentTo')} <strong>{verificationEmail}</strong>
            </p>

            <form className="space-y-3" onSubmit={handleVerifyOtp}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.enterSixDigitCode')}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmittingOtp}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmittingOtp ? t('processingLoading') : t('auth.verifyAndContinue')}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResendingOtp}
              className="mt-3 w-full rounded-lg border border-blue-600 px-4 py-3 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
            >
              {isResendingOtp ? t('sending') : t('auth.resendOtp')}
            </button>

            {!showEmailChange ? (
              <button
                type="button"
                onClick={() => setShowEmailChange(true)}
                className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('auth.changeEmailAddress')}
              </button>
            ) : (
              <form className="mt-3 space-y-2" onSubmit={handleChangeEmail}>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t('auth.newEmailPlaceholder')}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isChangingEmail}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {isChangingEmail ? t('processingLoading') : t('auth.updateEmailAndSendCode')}
                </button>
              </form>
            )}
          </>
        )}

        {verifyState === 'error' && (
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
            {mode === 'otp' && (
              <button
                type="button"
                onClick={() => setVerifyState('otp')}
                className="mb-3 w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                {t('auth.tryAgain')}
              </button>
            )}
            <Link href="/login" replace className="text-blue-600 hover:underline font-semibold">
              {t('backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
