'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { use2FA } from '@/hooks/use2FA';

export default function AdminTwoFactorPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [otpCode, setOtpCode] = useState('');
  const { verifyOTP, loading, error } = use2FA();
  const [localError, setLocalError] = useState('');
  const [userId, setUserId] = useState('');

  // Get userId from session storage or URL params
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('admin_2fa_user_id');
    if (!storedUserId) {
      router.push('/login');
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    try {
      if (!otpCode || otpCode.length !== 6) {
        setLocalError('Please enter a valid 6-digit OTP');
        return;
      }

      const otpSessionToken = sessionStorage.getItem('admin_otp_session_token') || '';
      const result = await verifyOTP(userId, otpCode, otpSessionToken);
      if (!result.success) {
        setLocalError(result.error || 'Failed to verify OTP. Please try again.');
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('admin_2fa_user_id');

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setLocalError('An error occurred. Please try again.');
      console.error('OTP verification error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2 p-6">
          <h1 className="text-2xl font-bold">Admin 2FA Verification</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <div className="p-6 pt-0">
          {(localError || error) && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="otp" className="block text-sm font-medium">
                OTP Code
              </label>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                maxLength={6}
                disabled={loading}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono text-2xl tracking-widest dark:border-slate-700 dark:bg-slate-800"
              />
              <p className="text-xs text-slate-500 text-center">Enter the 6-digit code</p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>Don't have your authenticator code?</p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('admin_2fa_user_id');
                sessionStorage.removeItem('admin_otp_session_token');
                router.push('/login');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
