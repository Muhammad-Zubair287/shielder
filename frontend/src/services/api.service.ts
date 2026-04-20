/**
 * Axios API Client
 * Configured Axios instance with interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, API_ENDPOINTS, STORAGE_KEYS } from '@/utils/constants';
import type { ApiResponse, ApiError } from '@/types';

// Cache locale so we don't hit localStorage on every request
let _cachedLocale: string | null = null;
const getCachedLocale = (): string => {
  if (!_cachedLocale) {
    _cachedLocale = (typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.LOCALE)
      : null) || 'en';
  }
  return _cachedLocale;
};
// Invalidate when locale changes (called from LanguageContext)
export const invalidateLocaleCache = () => { _cachedLocale = null; };

let refreshAccessTokenPromise: Promise<string> | null = null;

/**
 * Create Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL.endsWith('/') ? API_CONFIG.BASE_URL : `${API_CONFIG.BASE_URL}/`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor
 * Adds auth token to all requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from sessionStorage
    const token = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add locale to headers (cached — avoids localStorage read on every request)
    config.headers['Accept-Language'] = getCachedLocale();

    // Let Axios/browser set multipart boundaries automatically for FormData payloads.
    // Keeping a forced JSON content-type here causes multer to miss uploaded files.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof (config.headers as any).set === 'function') {
        (config.headers as any).set('Content-Type', undefined);
      } else {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Response interceptor should handle 401s except for auth endpoints
    const url = originalRequest.url || '';
    const isAuthEndpoint = url.includes('auth/login') ||
      url.includes('auth/signup') ||
      url.includes('auth/refresh') ||
      url.includes('auth/verify-email');

    // If error is 401 and we haven't retried yet and it's not an auth login/signup
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshAccessTokenPromise) {
          refreshAccessTokenPromise = (async () => {
            // Get refresh token
            const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

            if (!refreshToken) {
              console.warn('[API] No refresh token found during 401 recovery');
              throw new Error('No refresh token');
            }

            // Refresh the token - ensure Slash between BASE_URL and endpoint
            const refreshUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.BASE_URL.endsWith('/') ? '' : '/'}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`;

            const response = await axios.post(
              refreshUrl,
              { refreshToken: refreshToken.replace(/"/g, '') }
            );

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            // Store new tokens
            sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            if (newRefreshToken) {
              sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

            return accessToken;
          })().finally(() => {
            refreshAccessTokenPromise = null;
          });
        }

        const accessToken = await refreshAccessTokenPromise;

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and reset Zustand auth store
        sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
        // Also clear any legacy localStorage tokens
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        try {
          // Dynamically import Zustand store and reset state
          if (typeof window !== 'undefined') {
            const { useAuthStore } = await import('@/store/auth.store');
            useAuthStore.getState().setUser(null);
            useAuthStore.getState().setError(null);
            useAuthStore.getState().setLoading(false);
          }
        } catch (e) {
          // Ignore if Zustand store can't be reset
        }
        // Only redirect to login with 'expired' flag when the original
        // request actually carried an Authorization token — meaning a real
        // session existed and has now expired. If there was never a token
        // (unauthenticated request that simply got 401), skip the redirect
        // so public pages don't get wrongly bounced to the login screen.
        const hadToken = !!(originalRequest?.headers?.Authorization);
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isPublicPage = currentPath === '/login' || currentPath === '/register';
        if (typeof window !== 'undefined' && hadToken && !url.includes('auth/me') && !isPublicPage) {
          window.location.href = '/login?expired=true';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Error Handler
 */
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;

    // Handle timeout / network errors with a helpful message
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.toLowerCase().includes('timeout')) {
      return 'The server is taking longer than usual to respond (it may be waking up). The operation may have already succeeded — please refresh the page to check before trying again.';
    }

    // Handle no network response at all
    if (!axiosError.response) {
      return 'Unable to reach the server. Please check your internet connection and try again.';
    }

    // Handle Joi validation errors from backend
    if (axiosError.response?.data?.errors && Array.isArray(axiosError.response.data.errors) && axiosError.response.data.errors.length > 0) {
      return axiosError.response.data.errors.map(err => err.message).join('. ');
    }

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.message) {
      return axiosError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

export default apiClient;
