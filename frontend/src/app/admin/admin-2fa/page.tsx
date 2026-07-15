'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronLeft, Lock } from 'lucide-react';
import { use2FA } from '@/hooks/use2FA';

const parseOtpError = (message: string) => {
  const invalidMatch = message.match(/Invalid OTP\.\s*(\d+)\s*attempts remaining\.?/i);
  if (invalidMatch) {
    const attemptsRemaining = Number(invalidMatch[1]);
    return {
      tone: 'warning' as const,
      title: 'Incorrect code',
      detail: `You entered the wrong OTP. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} remaining before lockout.`,
    };
  }

  if (/OTP expired/i.test(message)) {
    return {
      tone: 'error' as const,
      title: 'Code expired',
      detail: 'This verification code has expired. Please go back and request a new login code.',
    };
  }

  return {
    tone: 'error' as const,
    title: 'Verification failed',
    detail: message,
  };
};

export default function AdminTwoFactorPage() {
  const router = useRouter();
  const [otpCode, setOtpCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const { verifyOTP, loading, error } = use2FA();
  const [localError, setLocalError] = useState('');
  const [userId, setUserId] = useState('');

  // Get userId from session storage or URL params
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('admin_2fa_user_id');
    if (!storedUserId) {
      router.replace('/login');
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
      const result = await verifyOTP(userId, otpCode, otpSessionToken, rememberDevice);
      if (!result.success) {
        setLocalError(result.error || 'Failed to verify OTP. Please try again.');
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('admin_2fa_user_id');
      sessionStorage.removeItem('admin_otp_session_token');

      // Redirect to admin dashboard
      router.push('/admin/dashboard');
    } catch (err) {
      setLocalError('An error occurred. Please try again.');
      console.error('OTP verification error:', err);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem('admin_2fa_user_id');
    sessionStorage.removeItem('admin_otp_session_token');
    router.replace('/login');
  };

  const errorMessage = localError || error || '';
  const otpError = errorMessage ? parseOtpError(errorMessage) : null;

  return (
    <div className="min-h-screen bg-[#F5F6FA] dark:bg-slate-950 flex flex-col">
      {/* Header - matching admin dashboard shell styling */}
      <header className="h-[72px] bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm flex items-center px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <Shield className="h-5 w-5 text-gray-600" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-base font-black text-gray-900 leading-tight tracking-tight">2FA Verification</h1>
            <p className="text-[10px] font-semibold text-[#FF6B35] uppercase tracking-widest leading-tight">Admin Panel</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-7">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Card Header with gradient */}
            <div className="bg-[#0C1B33] px-8 py-8 border-b-4 border-[#FF6B35]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                  <Lock className="h-6 w-6 text-[#FF6B35]" />
                </div>
                <h2 className="text-2xl font-bold text-white">2FA Verification</h2>
              </div>
              <p className="text-slate-300">Secure your account with two-factor authentication</p>
            </div>

            {/* Card Body */}
            <div className="px-8 py-8">
              <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong>A verification code has been sent to your email.</strong> Please enter the 6-digit code below to continue and access your dashboard.
                </p>
              </div>

              {otpError && (
                <div className={`mb-6 rounded-lg border p-4 ${otpError.tone === 'warning' ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${otpError.tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}`}>
                    {otpError.title}
                  </p>
                  <p className={`text-sm ${otpError.tone === 'warning' ? 'text-amber-800 dark:text-amber-200' : 'text-red-700 dark:text-red-300'}`}>
                    {otpError.detail}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* OTP Input */}
                <div className="space-y-2">
                  <label htmlFor="otp" className="block text-sm font-semibold text-slate-900 dark:text-white">
                    Enter OTP Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    }}
                    maxLength={6}
                    disabled={loading}
                    className="w-full rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-center font-mono text-3xl font-bold tracking-[0.5em] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">6 digits, check your email and spam folder</p>
                </div>

                {/* Remember Device Checkbox */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <input
                    id="remember-device"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberDevice(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                  />
                  <label htmlFor="remember-device" className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Remember this device for 30 days
                  </label>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
                  Skip 2FA verification on this device. You'll need 2FA again on new devices.
                </p>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full rounded-xl bg-[#0C1B33] hover:bg-[#13284a] disabled:bg-slate-300 disabled:cursor-not-allowed px-4 py-3 font-bold text-white transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-[#FF6B35] animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Access Dashboard'
                  )}
                </button>
              </form>

              {/* Back to Login Link */}
              <button
                onClick={handleBackToLogin}
                className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 py-2 rounded-lg transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Login
              </button>
            </div>
          </div>

          {/* Footer Help Text */}
          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>Didn&apos;t receive the code? Check your email inbox and spam folder.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

