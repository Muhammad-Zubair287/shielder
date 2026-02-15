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
import { ROUTES, SUCCESS_MESSAGES } from '@/utils/constants';
import toast from 'react-hot-toast';

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

      const response = await authService.register(data);
      setUser(response.user);

      toast.success(SUCCESS_MESSAGES.REGISTER_SUCCESS);
      router.push(ROUTES.CUSTOMER_DASHBOARD);

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

      const response = await authService.login(data);
      setUser(response.user);

      toast.success(SUCCESS_MESSAGES.LOGIN_SUCCESS);

      // Redirect based on role
      if (response.user.role === 'ADMIN' || response.user.role === 'SUPER_ADMIN') {
        router.push(ROUTES.ADMIN_DASHBOARD);
      } else {
        router.push(ROUTES.CUSTOMER_DASHBOARD);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
