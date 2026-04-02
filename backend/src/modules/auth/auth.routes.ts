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

export default router;
