/**
 * Auth Service
 * Authentication-related API calls
 */

import apiClient, { handleApiError, LockoutError } from './api.service';
import axios from 'axios';
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
  private getTrustedDeviceToken(): string | null {
    if (typeof window === 'undefined') return null;

    return localStorage.getItem(STORAGE_KEYS.TRUSTED_DEVICE_TOKEN);
  }

  private setTrustedDeviceToken(token: string): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(STORAGE_KEYS.TRUSTED_DEVICE_TOKEN, token);
  }

  clearTrustedDeviceToken(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(STORAGE_KEYS.TRUSTED_DEVICE_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.TRUSTED_DEVICE_TOKEN);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.REGISTER,
        data,
        {
          // Signup can be slower on cold starts; keep this higher than default.
          timeout: 120000,
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Initiate OTP-based registration (Step 1 — no user created)
   */
  async initiateRegistration(data: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    address?: string;
    location?: string;
    companyName?: string;
    preferredLanguage?: string;
  }): Promise<{ registrationSessionToken: string; email: string; expiresInMinutes: number }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP_INITIATE, data, { timeout: 120000 });
    return res.data.data;
  }

  /**
   * Verify registration OTP and create the user account (Step 2)
   */
  async verifyRegistrationOtp(registrationSessionToken: string, code: string): Promise<{ message: string }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP_VERIFY_OTP, {
      registrationSessionToken,
      code,
    });
    return res.data;
  }

  /**
   * Resend registration OTP
   */
  async resendRegistrationOtp(registrationSessionToken: string): Promise<{ message: string; data: { email: string; expiresInMinutes: number } }> {
    const res = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP_RESEND_OTP, {
      registrationSessionToken,
    });
    return res.data;
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

      const authData = {
        ...response.data.data!,
        // Keep the API message with the auth result.  The API is the source of
        // truth for messages because mobile and web must show identical copy.
        message: response.data.message,
      };

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
      if (axios.isAxiosError(error)) {
        const payload = error.response?.data as {
          requiresVerification?: boolean;
          verificationSessionToken?: string;
          verificationExpiresInMinutes?: number;
          verificationEmail?: string;
          user?: AuthResponse['user'];
          message?: string;
        } | undefined;

        if (error.response?.status === 403 && payload?.requiresVerification) {
          return {
            user: payload.user,
            requiresVerification: true,
            verificationSessionToken: payload.verificationSessionToken,
            verificationExpiresInMinutes: payload.verificationExpiresInMinutes,
            verificationEmail: payload.verificationEmail,
          };
        }
      }

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
   * Send OTP for forgot-password flow (email)
   */
  async sendForgotPasswordOtp(email: string): Promise<void> {
    try {
      await apiClient.post(`${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}/send-otp`, { email }, { timeout: 120000 });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const data = error.response.data as { message?: string; lockedUntil?: string };
        if (data?.lockedUntil) {
          throw new LockoutError(data.message ?? 'Too many attempts', data.lockedUntil);
        }
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Resend forgot-password OTP
   */
  async resendForgotPasswordOtp(email: string): Promise<void> {
    try {
      await apiClient.post(`${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}/resend-otp`, { email }, { timeout: 120000 });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const data = error.response.data as { message?: string; lockedUntil?: string };
        if (data?.lockedUntil) {
          throw new LockoutError(data.message ?? 'Too many attempts', data.lockedUntil);
        }
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Verify forgot-password OTP and receive a short-lived reset session token
   */
  async verifyForgotPasswordOtp(data: { email: string; code: string }): Promise<{ resetSessionToken: string; expiresInMinutes: number }> {
    try {
      const response = await apiClient.post<ApiResponse<{ resetSessionToken: string; expiresInMinutes: number }>>(
        `${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}/verify-otp`,
        data
      );

      return response.data.data!;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const resData = error.response.data as { message?: string; lockedUntil?: string };
        if (resData?.lockedUntil) {
          throw new LockoutError(resData.message ?? 'Too many attempts', resData.lockedUntil);
        }
      }
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get list of trusted devices for current user
   */
  async getTrustedDevices(): Promise<any[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.TRUSTED_DEVICES);
      return response.data.data?.devices || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Revoke a trusted device by token
   */
  async revokeTrustedDevice(token: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.AUTH.TRUSTED_DEVICE_REVOKE(token));
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Reset password using forgot-password OTP reset session token
   */
  async resetPasswordWithForgotOtp(resetSessionToken: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(`${API_ENDPOINTS.AUTH.FORGOT_PASSWORD}/reset`, {
        resetSessionToken,
        newPassword,
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
  async verifyOTP(data: { userId: string; code: string; otpSessionToken?: string; rememberDevice?: boolean }): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        API_ENDPOINTS.AUTH.VERIFY_OTP,
        data
      );

      const authData = response.data.data!;
      if (authData.trustedDeviceToken) {
        this.setTrustedDeviceToken(authData.trustedDeviceToken);
      }
      if (authData.tokens?.accessToken && authData.tokens?.refreshToken) {
        this.storeAuthData(authData);
      }

      return authData;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Check whether the current browser/device is already trusted
   */
  async getTrustedDeviceStatus(): Promise<{ trusted: boolean; expiresAt: string | null }> {
    try {
      const response = await apiClient.get<ApiResponse<{ trusted: boolean; expiresAt: string | null }>>(
        API_ENDPOINTS.AUTH.TRUSTED_DEVICE_STATUS
      );

      return response.data.data || { trusted: false, expiresAt: null };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<boolean> {
    // A timeout/logout request can finish after a new login.  Capture the
    // session it belongs to so its finally block never removes the new tokens.
    const accessToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      return this.clearAuthDataIfCurrent(accessToken, refreshToken);
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
   * Verify OTP for forced email re-verification
   */
  async verifyEmailOtp(verificationSessionToken: string, code: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL_OTP, {
        verificationSessionToken,
        code,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Resend OTP for forced email re-verification
   */
  async resendEmailOtp(verificationSessionToken: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.RESEND_EMAIL_OTP, {
        verificationSessionToken,
      });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Change email while in forced verification flow
   */
  async changeVerificationEmail(
    verificationSessionToken: string,
    newEmail: string
  ): Promise<{ verificationSessionToken: string; verificationEmail: string; expiresInMinutes: number }> {
    try {
      const response = await apiClient.post<
        ApiResponse<{ verificationSessionToken: string; verificationEmail: string; expiresInMinutes: number }>
      >(API_ENDPOINTS.AUTH.CHANGE_VERIFICATION_EMAIL, {
        verificationSessionToken,
        newEmail,
      });

      return response.data.data!;
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
  private clearAuthDataIfCurrent(accessToken: string | null, refreshToken: string | null): boolean {
    // Another session superseded this one while its logout request was in
    // flight.  It owns the storage now and must not be cleared.
    if (
      sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) !== accessToken ||
      sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) !== refreshToken
    ) {
      return false;
    }

    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    this.clearTrustedDeviceToken();
    // Also clear any legacy localStorage tokens from before this change
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    return true;
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
