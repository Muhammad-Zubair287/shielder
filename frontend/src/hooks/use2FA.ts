/**
 * Hook for 2FA OTP verification
 * Centralizes API logic for admin/superadmin 2FA flow with device trust
 */

import { useState } from 'react';
import { authService } from '@/services/auth.service';
import type { AuthResponse } from '@/types';

interface Use2FAResult {
  verifyOTP: (
    userId: string,
    code: string,
    sessionToken: string,
    rememberDevice?: boolean
  ) => Promise<{ success: boolean; data?: AuthResponse; error?: string }>;
  loading: boolean;
  error: string | null;
}

export const use2FA = (): Use2FAResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyOTP = async (
    userId: string,
    code: string,
    sessionToken: string,
    rememberDevice?: boolean
  ) => {
    try {
      setLoading(true);
      setError(null);

      const data = await authService.verifyOTP({
        userId,
        code,
        otpSessionToken: sessionToken,
        rememberDevice: rememberDevice || false,
      });

      return {
        success: true,
        data,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'OTP verification failed';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  };

  return { verifyOTP, loading, error };
};
