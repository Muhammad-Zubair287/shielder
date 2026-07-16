/**
 * Auth Store
 * Global state management for authentication using Zustand
 */

import { create } from 'zustand';
import type { User } from '@/types';
import authService from '@/services/auth.service';
import { broadcastSync } from '@/lib/crossTabSync';
import { disconnectSocket } from '@/lib/socket';
import { STORAGE_KEYS } from '@/utils/constants';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initialize: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Actions
  setUser: (user) => {
    // Keep sessionStorage in sync so profile picture persists within the session
    if (typeof window !== 'undefined') {
      if (user) {
        sessionStorage.setItem('shielder_user', JSON.stringify(user));
      } else {
        sessionStorage.removeItem('shielder_user');
      }
    }
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  initialize: () => {
    const storedUser = authService.getStoredUser();
    const isAuthenticated = authService.isAuthenticated();

    set({
      user: storedUser,
      isAuthenticated,
      isLoading: false,
    });
  },

  logout: async () => {
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
      // Tear down the real-time socket connection
      disconnectSocket();
      // Tell every other open tab to log out too
      broadcastSync({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear session timeout data to prevent stale session checks
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT_MS);
        localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
        localStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT_MS);
      }
    }
  },

  clearError: () =>
    set({
      error: null,
    }),
}));
