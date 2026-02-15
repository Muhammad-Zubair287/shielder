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
  RefreshTokenRequest,
  ApiResponse,
  User,
} from '@/types';

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
        data
      );

      const authData = response.data.data!;

      // Store tokens and user
      this.storeAuthData(authData);

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
        data
      );

      const authData = response.data.data!;

      // Store tokens and user
      this.storeAuthData(authData);

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
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
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
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (newRefreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
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
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      return user;
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
  private storeAuthData(authData: any): void {
    const accessToken = authData.accessToken || authData.tokens?.accessToken;
    const refreshToken = authData.refreshToken || authData.tokens?.refreshToken;

    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (authData.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authData.user));
  }

  /**
   * Clear authentication data from localStorage
   */
  private clearAuthData(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get stored user
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}

export default new AuthService();
