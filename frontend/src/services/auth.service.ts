/**
 * Auth Service
 * Authentication-related API calls
 */

import apiClient, { handleApiError } from './api.service';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/utils/constants';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  User,
  ChangePasswordRequest,
} from '@/types';

type StorableAuthData = Partial<AuthResponse> & {
  accessToken?: string;
  refreshToken?: string;
};

/**
 * Auth Service Class
 */
class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.REGISTER,
        data,
        {
          // Signup can be slower on cold starts; keep this higher than default.
          timeout: 120000,
        }
      );

      const authData = response.data.data!;

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        data,
        {
          timeout: 120000,
        }
      );

      const authData = response.data.data!;

      // Only store auth data if 2FA is not required (i.e., we have valid tokens)
      if (
        !authData.requiresTwoFactor &&
        authData.tokens?.accessToken &&
        authData.tokens?.refreshToken
      ) {
        this.storeAuthData(authData);
      }

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }, {
        // Cold starts on Railway can exceed the default API timeout.
        timeout: 120000,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Resend email verification link
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, { email }, {
        // Match other auth flows to avoid false timeout toasts on cold starts.
        timeout: 120000,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        newPassword: password,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Verify OTP and complete 2FA login flow
   */
  async verifyOTP(data: { userId: string; code: string; otpSessionToken?: string }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.VERIFY_OTP,
        data
      );

      const authData = response.data.data!;
      if (authData.tokens?.accessToken && authData.tokens?.refreshToken) {
        this.storeAuthData(authData);
      }

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      this.clearAuthData();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await apiClient.post<
        ApiResponse<{ accessToken: string; refreshToken: string }>
      >(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data!;

      // Store new access token
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (newRefreshToken) {
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      }

      return accessToken;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<ApiResponse<{ user: User }>>(
        API_ENDPOINTS.AUTH.ME
      );

      const user = response.data.data!.user;

      // Update user in local storage
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      return user;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    try {
      await apiClient.patch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.get(`${API_ENDPOINTS.AUTH.VERIFY_EMAIL}/${token}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Store authentication data in localStorage
   */
  private storeAuthData(authData: StorableAuthData): void {
    if (!authData) return;

    // Extraction logic that handles both {user, tokens: {at, rt}} and {at, rt}
    let accessToken = authData.accessToken;
    let refreshToken = authData.refreshToken;
    const user = authData.user;

    if (authData.tokens) {
      accessToken = authData.tokens.accessToken || accessToken;
      refreshToken = authData.tokens.refreshToken || refreshToken;
    }

    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }
    
    if (refreshToken) {
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearAuthData(): void {
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    // Also clear any legacy localStorage tokens from before this change
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get stored user
   */
  getStoredUser(): User | null {
    const userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
