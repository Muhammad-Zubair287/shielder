'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ForgotPasswordVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(Array(6).fill(''));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password');
      return;
    }

    inputsRef.current[0]?.focus();
    const id = setInterval(() => {
      setTimer((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [email, router]);

  const handleChange = (idx: number, val: string) => {
    if (!/^[0-9]*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);

    if (val && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      const prev = inputsRef.current[idx - 1];
      prev?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData('text').trim();
    if (!/^[0-9]{6}$/.test(paste)) return;
    const arr = paste.split('');
    setCode(arr);
    // focus last
    inputsRef.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = code.join('');
    if (value.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.verifyForgotPasswordOtp({ email, code: value });
      const token = res.resetSessionToken;
      router.push(`/forgot-password/reset?token=${encodeURIComponent(token)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResendLoading(true);
    try {
      await authService.resendForgotPasswordOtp(email);
      setTimer(30);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

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
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">{t('OTP Verification')}</h1>
        <p className="text-sm text-slate-600 mb-6">{t('We have sent verification code to')} {email}</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-6">
          <div className="flex justify-between gap-2 sm:gap-2.5">
            {code.map((ch, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputsRef.current[idx] = el;
                }}
                inputMode="numeric"
                value={ch}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-11 h-11 sm:w-12 sm:h-12 text-center border border-slate-300 rounded-xl text-lg font-semibold focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none"
                maxLength={1}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#FF7A1A] text-white rounded-full font-semibold hover:bg-[#f06d08] disabled:opacity-50 transition"
          >
            {loading ? t('processing') : t('Next')}
          </button>

          <div className="text-center text-sm text-slate-600">
            {timer > 0 ? (
              <span>{t('Didn\'t get a code?')} 00:{timer.toString().padStart(2, '0')}</span>
            ) : (
              <button type="button" onClick={handleResend} disabled={resendLoading} className="text-[#FF7A1A] hover:underline font-semibold">
                {resendLoading ? t('resending') : t('Resend code')}
              </button>
            )}
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
