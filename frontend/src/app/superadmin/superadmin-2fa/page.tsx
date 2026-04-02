'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';

export default function SuperAdminTwoFactorPage() {
  const router = useRouter();
  const [otpCode, setOtpCode] = useState('');
  const { verifyOTP, loading, error } = use2FA();
  const [localError, setLocalError] = useState('');
  const [userId, setUserId] = useState('');

  // Get userId from session storage or URL params
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('superadmin_2fa_user_id');
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

      const otpSessionToken = sessionStorage.getItem('superadmin_otp_session_token') || '';
      const result = await verifyOTP(userId, otpCode, otpSessionToken);
      if (!result.success) {
        setLocalError(result.error || 'Failed to verify OTP. Please try again.');
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('superadmin_2fa_user_id');

      // Redirect to super-admin dashboard
      router.push('/superadmin/dashboard');
    } catch (err) {
      setLocalError('An error occurred. Please try again.');
      console.error('OTP verification error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950 dark:to-indigo-950 p-4">
      <div className="w-full max-w-md rounded-xl border-2 border-purple-200 bg-white shadow-2xl dark:border-purple-800 dark:bg-slate-900">
        <div className="space-y-3 rounded-t-lg bg-gradient-to-r from-purple-50 to-indigo-50 p-6 dark:from-purple-900 dark:to-indigo-900">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <h1 className="text-2xl font-bold">Super Admin 2FA Verification</h1>
          </div>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <div className="p-6 pt-6">
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
              className="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>Don't have your authenticator code?</p>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('superadmin_2fa_user_id');
                sessionStorage.removeItem('superadmin_otp_session_token');
                router.push('/login');
              }}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
