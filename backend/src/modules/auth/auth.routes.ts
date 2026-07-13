/**
 * Enhanced Authentication Routes
 * All authentication endpoints with proper middleware
 */

import { Router } from 'express';
import authController from './auth.controller';
import { authenticate } from './auth.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { authValidation } from './auth.validation';
import { rateLimitAuth } from '@/common/middleware/rateLimit.middleware';

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * POST /api/auth/signup
 * Register a new user
 * Rate limit: 5 requests per hour per IP
 */
router.post(
  '/signup',
  rateLimitAuth({
    maxRequests: 5,
    windowMinutes: 2,
    identifierFn: (req) => (req.body?.email as string)?.toLowerCase() || req.ip || 'unknown',
  }),
  validate(authValidation.register),
  authController.signup
);

/**
 * POST /api/auth/login
 * User login
 * Rate limit: 10 requests per 15 minutes per IP
 */
router.post(
  '/login',
  rateLimitAuth({ maxRequests: 10, windowMinutes: 15 }),
  validate(authValidation.login),
  authController.login
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 * Rate limit: 20 requests per hour
 */
router.post(
  '/refresh',
  rateLimitAuth({ maxRequests: 20, windowMinutes: 60 }),
  validate(authValidation.refreshToken),
  authController.refreshToken
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 * Rate limit: 3 requests per hour per IP
 */
router.post(
  '/forgot-password',
  rateLimitAuth({ maxRequests: 3, windowMinutes: 60 }),
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

/**
 * POST /api/auth/forgot-password/send-otp
 * Send forgot-password OTP to user's email
 * Rate limit: 3 requests per hour per IP
 */
router.post(
  '/forgot-password/send-otp',
  rateLimitAuth({ maxRequests: 3, windowMinutes: 15, identifierFn: (req) => req.body.email?.toLowerCase() || req.ip }),
  validate(authValidation.forgotPasswordSendOtp),
  authController.sendForgotPasswordOtp
);

/**
 * POST /api/auth/forgot-password/resend-otp
 * Resend forgot-password OTP to user's email
 * Rate limit: 5 requests per 15 minutes
 */
router.post(
  '/forgot-password/resend-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.forgotPasswordResendOtp),
  authController.resendForgotPasswordOtp
);

/**
 * POST /api/auth/forgot-password/verify-otp
 * Verify forgot-password OTP and issue reset session token
 * Rate limit: 5 requests per 15 minutes
 */
router.post(
  '/forgot-password/verify-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.forgotPasswordVerifyOtp),
  authController.verifyForgotPasswordOtp
);

/**
 * POST /api/auth/forgot-password/reset
 * Reset password using verified forgot-password OTP session
 * Rate limit: 5 requests per hour
 */
router.post(
  '/forgot-password/reset',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 60 }),
  validate(authValidation.forgotPasswordResetWithOtp),
  authController.resetPasswordWithForgotOtp
);

/**
 * POST /api/auth/signup/initiate
 * Step 1: Validate data, send OTP. User NOT created yet.
 */
router.post(
  '/signup/initiate',
  rateLimitAuth({
    maxRequests: 5,
    windowMinutes: 10,
    identifierFn: (req) => (req.body?.email as string)?.toLowerCase() || req.ip || 'unknown',
  }),
  validate(authValidation.initiateRegistration),
  authController.initiateRegistration
);

/**
 * POST /api/auth/signup/verify-otp
 * Step 2: Verify OTP → create user account.
 */
router.post(
  '/signup/verify-otp',
  rateLimitAuth({ maxRequests: 10, windowMinutes: 15 }),
  validate(authValidation.verifyRegistrationOtp),
  authController.verifyRegistrationOtp
);

/**
 * POST /api/auth/signup/resend-otp
 * Resend registration OTP.
 */
router.post(
  '/signup/resend-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.resendRegistrationOtp),
  authController.resendRegistrationOtp
);

/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 * Rate limit: 3 requests per hour per IP
 */
router.post(
  '/resend-verification',
  rateLimitAuth({ maxRequests: 3, windowMinutes: 60 }),
  validate(authValidation.resendVerificationEmail),
  authController.resendVerificationEmail
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 * Rate limit: 5 requests per hour
 */
router.post(
  '/reset-password',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 60 }),
  validate(authValidation.resetPassword),
  authController.resetPassword
);

/**
 * GET /api/auth/verify-email/:token
 * Verify email address
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * POST /api/auth/send-otp
 * Send OTP for 2FA
 * Rate limit: 3 requests per 15 minutes
 */
router.post(
  '/send-otp',
  rateLimitAuth({ maxRequests: 3, windowMinutes: 15 }),
  validate(authValidation.sendOTP),
  authController.sendOTP
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP for 2FA
 * Rate limit: 5 requests per 15 minutes
 */
router.post(
  '/verify-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.verifyOTP),
  authController.verifyOTP
);

/**
 * POST /api/auth/verification/verify-otp
 * Verify OTP for forced email re-verification flow
 * Rate limit: 5 requests per 15 minutes
 */
router.post(
  '/verification/verify-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.verifyEmailOtp),
  authController.verifyEmailOtp
);

/**
 * POST /api/auth/verification/resend-otp
 * Resend OTP for forced email re-verification flow
 * Rate limit: 5 requests per 15 minutes
 */
router.post(
  '/verification/resend-otp',
  rateLimitAuth({ maxRequests: 5, windowMinutes: 15 }),
  validate(authValidation.resendEmailVerificationOtp),
  authController.resendEmailVerificationOtp
);

/**
 * POST /api/auth/verification/change-email
 * Change email while user is pending forced verification
 * Rate limit: 3 requests per 15 minutes
 */
router.post(
  '/verification/change-email',
  rateLimitAuth({ maxRequests: 3, windowMinutes: 15 }),
  validate(authValidation.changeVerificationEmail),
  authController.changeVerificationEmail
);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * POST /api/auth/logout
 * Logout from current device
 */
router.post(
  '/logout',
  authenticate,
  validate(authValidation.logout),
  authController.logout
);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * PATCH /api/auth/change-password
 * Change password (requires old password)
 */
router.patch(
  '/change-password',
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword
);

/**
 * GET /api/auth/sessions
 * Get all active sessions
 */
router.get('/sessions', authenticate, authController.getSessions);

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session
 */
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

/**
 * Trusted devices
 */
router.get('/trusted-devices', authenticate, authController.getTrustedDevices);
router.delete('/trusted-devices/:token', authenticate, authController.revokeTrustedDevice);
router.get('/trusted-device/status', authController.getTrustedDeviceStatus);

export default router;
