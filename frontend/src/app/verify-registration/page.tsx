'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Mail, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import authService from '@/services/auth.service';
import Link from 'next/link';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerifyRegistrationPage() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  const [sessionToken, setSessionToken] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load session from sessionStorage
  useEffect(() => {
    const token = sessionStorage.getItem('reg_session_token');
    const storedEmail = sessionStorage.getItem('reg_email');
    if (!token || !storedEmail) {
      router.replace('/register');
      return;
    }
    setSessionToken(token);
    setEmail(storedEmail);
  }, [router]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) focusInput(index - 1);
    if (e.key === 'ArrowLeft' && index > 0) focusInput(index - 1);
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) focusInput(index + 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleVerify = useCallback(async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) { setError(t('regOtpCodeRequired')); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authService.verifyRegistrationOtp(sessionToken, code);
      setSuccess(true);
      sessionStorage.removeItem('reg_session_token');
      sessionStorage.removeItem('reg_email');
      toast.success(res.message || t('regOtpSuccess'));
      setTimeout(() => router.replace('/login'), 1800);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('regOtpExpired');
      setError(msg);
      setOtp(Array(OTP_LENGTH).fill(''));
      focusInput(0);
    } finally {
      setLoading(false);
    }
  }, [otp, sessionToken, router, t]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.every(d => d !== '') && !loading && !success) {
      handleVerify();
    }
  }, [otp, handleVerify, loading, success]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError('');
    try {
      const res = await authService.resendRegistrationOtp(sessionToken);
      toast.success(res.message || t('regOtpResend'));
      setOtp(Array(OTP_LENGTH).fill(''));
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      focusInput(0);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to resend';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('regOtpSuccess')}</h2>
          <p className="text-gray-500 text-sm">{t('redirectingToLogin') || 'Redirecting to login...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 relative">
        {/* Back */}
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('reg_session_token');
            sessionStorage.removeItem('reg_email');
            router.replace('/register');
          }}
          className={`absolute top-6 ${isRTL ? 'right-6' : 'left-6'} inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg`}
        >
          <BackArrow className="w-4 h-4" />
          <span>{t('regOtpBackToSignup')}</span>
        </button>

        {/* Header */}
        <div className="text-center mt-8 mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-[#0205A6]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('regOtpTitle')}</h1>
          <p className="text-sm text-gray-500">
            {t('regOtpSubtitle')}{' '}
            <span className="font-semibold text-gray-800" dir="ltr">{email}</span>
          </p>
        </div>

        {/* OTP Input Boxes — always LTR for numeric entry */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 text-center">
            {t('regOtpEnterCode')}
          </p>
          <div className="flex justify-center gap-3" dir="ltr">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition-all
                  ${digit ? 'border-[#0205A6] bg-blue-50 text-[#0205A6]' : 'border-gray-200 bg-gray-50 text-gray-900'}
                  ${error ? 'border-red-400 bg-red-50' : ''}
                  focus:border-[#0205A6] focus:bg-blue-50 focus:ring-2 focus:ring-[#0205A6]/20`}
                autoComplete="one-time-code"
                disabled={loading || success}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.some(d => !d)}
          className="w-full bg-[#0205A6] hover:bg-[#0204c0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /><span>{t('regOtpVerifying')}</span></>
          ) : (
            <span>{t('regOtpVerify')}</span>
          )}
        </button>

        {/* Resend */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">{t('regOtpDidntReceive')}</p>
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0205A6] hover:text-[#0204c0] disabled:opacity-50"
            >
              {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('regOtpResend')}
            </button>
          ) : (
            <p className="text-sm text-gray-400">
              {t('regOtpResendIn')} <span className="font-bold text-gray-600">{countdown}{t('regOtpSeconds')}</span>
            </p>
          )}
        </div>

        {/* Change email */}
        <div className="text-center mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('reg_session_token');
              sessionStorage.removeItem('reg_email');
              router.replace('/register');
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t('regOtpChangeEmail')}
          </button>
        </div>
      </div>
    </div>
  );
}
