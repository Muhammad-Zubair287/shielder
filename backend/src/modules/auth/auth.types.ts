/**
 * Authentication Types
 * TypeScript interfaces for all auth operations
 */

/**
 * User Registration Request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  companyName?: string;
  role?: 'ADMIN' | 'USER';
  preferredLanguage?: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * User Login Request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Forgot Password Request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset Password Request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Change Password Request
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * Refresh Token Request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Logout Request
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Device Info
 */
export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token Pair Response
 */
export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Auth Response
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
    isActive: boolean;
    profile?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      companyName?: string;
      locale?: string;
    };
  };
  tokens: TokenPairResponse;
}

/**
 * User Session
 */
export interface UserSession {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
}
