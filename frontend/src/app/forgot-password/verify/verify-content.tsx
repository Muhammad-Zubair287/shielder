'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { LockoutError } from '@/services/api.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthAlert } from '@/components/auth/AuthAlert';

export function ForgotPasswordVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRTL } = useLanguage();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(Array(6).fill(''));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);

  // Lockout state
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
    }
  }, [email, router]);

  // Resend countdown (30s)
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // Lockout countdown
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

  // Initial focus
  useEffect(() => {
    if (email) inputsRef.current[0]?.focus();
  }, [email]);

  const clearOtp = useCallback(() => {
    setCode(Array(6).fill(''));
    setTimeout(() => inputsRef.current[0]?.focus(), 0);
  }, []);

  const handleChange = (idx: number, val: string) => {
    if (!/^[0-9]*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').trim();
    if (!/^[0-9]{6}$/.test(paste)) return;
    setCode(paste.split(''));
    inputsRef.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const value = code.join('');
    if (value.length !== 6) {
      setError(t('auth.enterOtpError'));
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyForgotPasswordOtp({ email, code: value });
      router.replace(`/forgot-password/reset?token=${encodeURIComponent(res.resetSessionToken)}`);
    } catch (err: unknown) {
      if (err instanceof LockoutError) {
        setLockedUntil(new Date(err.lockedUntil));
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : t('auth.otpVerificationFailed'));
      }
      clearOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resendLoading || lockedUntil) return;
    setResendLoading(true);
    setError('');
    try {
      await authService.resendForgotPasswordOtp(email);
      setTimer(30);
    } catch (err: unknown) {
      if (err instanceof LockoutError) {
        setLockedUntil(new Date(err.lockedUntil));
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : t('auth.resendOtpFailed'));
      }
    } finally {
      setResendLoading(false);
    }
  };

  const lockMinutesLeft = Math.ceil(lockSecondsLeft / 60);

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
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('auth.otpVerificationTitle')}</h1>
          <p className="text-sm text-slate-600 mb-6">
            {t('auth.verificationCodeSentTo')} <span dir="ltr">{email}</span>
          </p>

          {error && (
            <AuthAlert type="error" message={error} onDismiss={() => setError('')} className="mb-4" />
          )}

          <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6">
            {/* OTP boxes — always LTR, always centered */}
            <div className="flex justify-between gap-2 sm:gap-2.5" dir="ltr">
              {code.map((ch, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputsRef.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  value={ch}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  dir="ltr"
                  style={{ textAlign: 'center' }}
                  className="w-11 h-11 sm:w-12 sm:h-12 border border-slate-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                  maxLength={1}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || lockSecondsLeft > 0}
              className="w-full h-11 bg-[#004A99] text-white rounded-full font-semibold hover:bg-[#0D2F8C] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? t('processingLoading') : t('next')}
            </button>

            <div className="text-center text-sm text-slate-600">
              {lockSecondsLeft > 0 ? (
                <span className="text-red-600 font-medium">
                  {t('auth.otpLockoutCountdown').replace('{{minutes}}', String(lockMinutesLeft))}
                </span>
              ) : timer > 0 ? (
                <span>
                  {t('auth.didntGetCode')}{' '}
                  <span dir="ltr">00:{timer.toString().padStart(2, '0')}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-[#004A99] hover:underline font-semibold disabled:opacity-50"
                >
                  {resendLoading ? t('resending') : t('auth.resendOtp')}
                </button>
              )}
            </div>

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
          </form>
        </div>
      </div>
    </div>
  );
}
