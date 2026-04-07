/**
 * useAuth Hook
 * Custom hook for authentication operations
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import authService from '@/services/auth.service';
import type { LoginRequest, RegisterRequest } from '@/types';
import { ROUTES, STORAGE_KEYS, SUCCESS_MESSAGES } from '@/utils/constants';
import toast from 'react-hot-toast';

const LOGIN_TOAST_DURATION_MS = 4000;

export const useAuth = () => {
  const router = useRouter();
  const { user, isAuthenticated, setUser, setLoading, setError, logout: storeLogout } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Register user
   */
  const register = async (data: RegisterRequest) => {
    try {
      setIsSubmitting(true);
      setError(null);

      router.prefetch(ROUTES.CUSTOMER_DASHBOARD);

      const response = await authService.register(data);
      setUser(null);

      toast.success(SUCCESS_MESSAGES.REGISTER_SUCCESS);

      router.replace(ROUTES.LOGIN);

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Login user
   */
  const login = async (data: LoginRequest) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Prevent cross-account redirects by clearing any stale in-memory/session auth
      // before starting a fresh login attempt.
      setUser(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }

      // Prefetch all possible destination routes BEFORE the API call so
      // Next.js starts downloading their JS chunks while the network request
      // is in-flight. This cuts the perceived redirect delay significantly.
      router.prefetch(ROUTES.SUPER_ADMIN_DASHBOARD);
      router.prefetch('/admin/dashboard');
      router.prefetch(ROUTES.CUSTOMER_DASHBOARD);

      const response = await authService.login(data);
      const role = String(response.user?.role ?? '').toUpperCase();

      const goToTwoFactorPage = (targetPath: string) => {
        if (typeof window !== 'undefined') {
          window.location.replace(targetPath);
          return;
        }

        router.replace(targetPath);
      };

      // ⚠️ SECURITY: Handle mandatory 2FA for admin and super-admin users
      if (response.requiresTwoFactor && response.otpSessionToken) {
        // Don't store user yet; they're pending 2FA verification.
        // Ensure no stale user remains in the store while waiting for OTP.
        setUser(null);
        toast.success('Login successful. Please verify with 2FA.', { duration: LOGIN_TOAST_DURATION_MS });
        
        // Store temporary session tokens for 2FA verification
        if (role === 'SUPER_ADMIN') {
          sessionStorage.setItem('superadmin_2fa_user_id', response.user.id);
          sessionStorage.setItem('superadmin_otp_session_token', response.otpSessionToken);
          goToTwoFactorPage('/superadmin/superadmin-2fa');
        } else if (role === 'ADMIN') {
          sessionStorage.setItem('admin_2fa_user_id', response.user.id);
          sessionStorage.setItem('admin_otp_session_token', response.otpSessionToken);
          goToTwoFactorPage('/admin/admin-2fa');
        } else {
          toast.error('Unable to continue to 2FA. Please try logging in again.', { duration: LOGIN_TOAST_DURATION_MS });
        }
        return response;
      }

      // Normal login flow (no 2FA needed)
      setUser(response.user);
      toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS, { duration: LOGIN_TOAST_DURATION_MS });

      // Redirect based on role
      if (role === 'SUPER_ADMIN') {
        router.replace(ROUTES.SUPER_ADMIN_DASHBOARD);
      } else if (role === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else {
        const redirectTo = typeof window !== 'undefined'
          ? (sessionStorage.getItem('post_login_redirect') || sessionStorage.getItem('checkout_redirect'))
          : null;
        if (redirectTo) {
          sessionStorage.removeItem('post_login_redirect');
          sessionStorage.removeItem('checkout_redirect');
          router.replace(redirectTo);
        } else {
          router.replace('/products');
        }
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage, { duration: LOGIN_TOAST_DURATION_MS });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      setLoading(true);
      await storeLogout();
      toast.success(SUCCESS_MESSAGES.LOGOUT_SUCCESS);
      router.push(ROUTES.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      setUser(user);
      return user;
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isSubmitting,
    register,
    login,
    logout,
    refreshUser,
  };
};
