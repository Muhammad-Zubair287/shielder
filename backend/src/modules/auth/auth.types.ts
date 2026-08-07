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
  address?: string;
  location?: string;
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
  rememberDevice?: boolean;
}

/**
 * Forgot Password Request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Forgot Password OTP Send Request
 */
export interface ForgotPasswordSendOtpRequest {
  email: string;
}

/**
 * Forgot Password OTP Verify Request
 */
export interface ForgotPasswordVerifyOtpRequest {
  email: string;
  code: string;
}

/**
 * Forgot Password OTP Reset Request
 */
export interface ForgotPasswordResetWithOtpRequest {
  resetSessionToken: string;
  newPassword: string;
}

/**
 * Email verification OTP verify request (forced verification flow)
 */
export interface VerifyEmailOtpRequest {
  verificationSessionToken: string;
  code: string;
}

/**
 * Resend email verification OTP request (forced verification flow)
 */
export interface ResendEmailVerificationOtpRequest {
  verificationSessionToken: string;
}

/**
 * Change email while pending verification
 */
export interface ChangeVerificationEmailRequest {
  verificationSessionToken: string;
  newEmail: string;
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
  trustedDeviceToken?: string;
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
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
    profile?: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      address?: string;
      location?: string;
      companyName?: string;
      locale?: string;
    };
  };
  tokens?: TokenPairResponse;
  emailDeliveryStatus?: 'email_sent' | 'auto_verified';
  requiresTwoFactor?: boolean;
  requiresEmailVerification?: boolean;
  verificationSessionToken?: string;
  verificationExpiresInMinutes?: number;
  verificationEmail?: string;
  otpSessionToken?: string;
  trustedDeviceToken?: string;
}

/**
 * Initiate Registration Request (Step 1 — pre-OTP)
 */
export interface InitiateRegistrationRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address?: string;
  location?: string;
  companyName?: string;
  preferredLanguage?: string;
}

/**
 * Verify Registration OTP Request (Step 2 — confirms OTP, creates user)
 */
export interface VerifyRegistrationOtpRequest {
  registrationSessionToken: string;
  code: string;
}

/**
 * Resend Registration OTP Request
 */
export interface ResendRegistrationOtpRequest {
  registrationSessionToken: string;
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
