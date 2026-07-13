/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Enhanced Authentication Controller
 * Production-ready HTTP handlers for all auth endpoints
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '@/common/utils/helpers';
import { env } from '@/config/env';
import { logger } from '@/common/logger/logger';
import type { AuthRequest } from '@/types/global';
import { t } from '@/common/i18n';
import type {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordVerifyOtpRequest,
  ForgotPasswordResetWithOtpRequest,
  VerifyEmailOtpRequest,
  ResendEmailVerificationOtpRequest,
  ChangeVerificationEmailRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  DeviceInfo,
  InitiateRegistrationRequest,
  VerifyRegistrationOtpRequest,
  ResendRegistrationOtpRequest,
} from './auth.types';

const getCookieValue = (cookieHeader: string | undefined, cookieName: string): string | undefined => {
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === cookieName) {
      return valueParts.join('=');
    }
  }

  return undefined;
};

/**
 * Auth Controller Class
 */
class AuthController {
  /**
   * @swagger
   * /api/auth/signup:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               fullName: { type: string }
   *     responses:
   *       201:
   *         description: Registration successful
   */
  signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: RegisterRequest = {
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const result = await AuthService.register(data);

    const isAutoVerified = result.emailDeliveryStatus === 'auto_verified';

    res.status(201).json({
      success: true,
      message: isAutoVerified
        ? t('auth.registerSuccessAutoVerified', req.locale)
        : t('auth.registerSuccessEmailRequired', req.locale),
      data: result,
    });
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Login successful
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: LoginRequest = req.body;
    // Accept trusted device token via header `x-trusted-device-token` or cookie `trustedDeviceToken` if present
    const headerToken = (req.headers['x-trusted-device-token'] as string) || undefined;
    const cookieToken = getCookieValue(req.headers.cookie, 'trustedDeviceToken');
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      trustedDeviceToken: headerToken || cookieToken,
    };

    if (headerToken) {
      logger.info(`📱 Login: Trusted device header found: ${headerToken.slice(0, 8)}...`);
    }
    if (cookieToken) {
      logger.info(`🍪 Login: Trusted device cookie found: ${cookieToken.slice(0, 8)}...`);
    }

    const result = await AuthService.login(data, deviceInfo, req.locale);

    if (result.requiresEmailVerification) {
      res.status(403).json({
        success: false,
        requiresVerification: true,
        message: t('auth.emailNotVerified', req.locale),
        verificationSessionToken: result.verificationSessionToken,
        verificationExpiresInMinutes: result.verificationExpiresInMinutes,
        verificationEmail: result.verificationEmail,
        user: result.user,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: t('auth.loginSuccess', req.locale),
      data: result,
    });
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200:
   *         description: Tokens refreshed
   */
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: t('auth.refreshTokenRequired', req.locale),
      });
      return;
    }

    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const tokens = await AuthService.refreshTokens(refreshToken, deviceInfo);

    res.status(200).json({
      success: true,
      message: t('auth.tokensRefreshed', req.locale),
      data: tokens,
    });
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout from current device
   *     tags: [Authentication]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200:
   *         description: Logged out
   */
  logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const userId = req.user!.userId;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: t('auth.refreshTokenRequired', req.locale),
      });
      return;
    }

    await AuthService.logout(userId, refreshToken);

    res.status(200).json({
      success: true,
      message: t('auth.logoutSuccess', req.locale),
    });
  });

  /**
   * @swagger
   * /api/auth/logout-all:
   *   post:
   *     summary: Logout from all devices
   *     tags: [Authentication]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Logged out from all devices
   */
  logoutAll = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    await AuthService.logoutAll(userId);

    res.status(200).json({
      success: true,
      message: t('auth.logoutAllSuccess', req.locale),
    });
  });

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, format: email }
   *     responses:
   *       200:
   *         description: Reset link sent
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ForgotPasswordRequest = req.body;

    await AuthService.forgotPassword(data);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: t('auth.forgotPasswordEmailSent', req.locale),
    });
  });

  /**
   * POST /api/auth/forgot-password/send-otp
   * Send OTP for forgot-password flow
   */
  sendForgotPasswordOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ForgotPasswordSendOtpRequest = req.body;

    await AuthService.sendForgotPasswordOtp(data);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: t('auth.forgotPasswordOtpSent', req.locale),
    });
  });

  /**
   * POST /api/auth/forgot-password/resend-otp
   * Resend OTP for forgot-password flow
   */
  resendForgotPasswordOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ForgotPasswordSendOtpRequest = req.body;

    await AuthService.resendForgotPasswordOtp(data);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: t('auth.forgotPasswordOtpResent', req.locale),
    });
  });

  /**
   * POST /api/auth/forgot-password/verify-otp
   * Verify forgot-password OTP and return temporary reset session token
   */
  verifyForgotPasswordOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ForgotPasswordVerifyOtpRequest = req.body;

    const result = await AuthService.verifyForgotPasswordOtp(data);

    res.status(200).json({
      success: true,
      message: t('auth.otpVerified', req.locale),
      data: result,
    });
  });

  /**
   * POST /api/auth/forgot-password/reset
   * Reset password using verified forgot-password OTP session token
   */
  resetPasswordWithForgotOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ForgotPasswordResetWithOtpRequest = req.body;

    await AuthService.resetPasswordWithForgotOtp(data);

    res.status(200).json({
      success: true,
      message: t('auth.passwordResetSuccess', req.locale),
    });
  });

  /**
   * POST /api/auth/resend-verification
   * Resend email verification link
   */
  resendVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string };

    const result = await AuthService.resendVerificationEmail(email);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: result.bypassed
        ? t('auth.devModeAutoVerified', req.locale)
        : t('auth.resendVerificationSent', req.locale),
    });
  });

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password using token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token, password]
   *             properties:
   *               token: { type: string }
   *               password: { type: string, minLength: 8 }
   *     responses:
   *       200:
   *         description: Password reset successful
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ResetPasswordRequest = req.body;

    await AuthService.resetPassword(data);

    res.status(200).json({
      success: true,
      message: t('auth.passwordResetSuccess', req.locale),
    });
  });

  /**
   * @swagger
   * /api/auth/change-password:
   *   patch:
   *     summary: Change password (authenticated)
   *     tags: [Authentication]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [oldPassword, newPassword]
   *             properties:
   *               oldPassword: { type: string }
   *               newPassword: { type: string, minLength: 8 }
   *     responses:
   *       200:
   *         description: Password changed successfully
   */
  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const data: ChangePasswordRequest = req.body;

    await AuthService.changePassword(userId, data);

    res.status(200).json({
      success: true,
      message: t('auth.passwordChangedSuccess', req.locale),
    });
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current authenticated user
   *     tags: [Authentication]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Current user data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                         email:
   *                           type: string
   *                         role:
   *                           type: string
   *                         status:
   *                           type: string
   *                         profile:
   *                           type: object
   *                           properties:
   *                             fullName:
   *                               type: string
   *                             phoneNumber:
   *                               type: string
   *                               example: "+966500000000"
   */
  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const user = await AuthService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /**
   * @swagger
   * /api/auth/verify-email/{token}:
   *   get:
   *     summary: Verify email address
   *     tags: [Authentication]
   *     parameters:
   *       - in: path
   *         name: token
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Email verified successfully
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    await AuthService.verifyEmail(token as string, req.locale);

    res.status(200).json({
      success: true,
      message: t('auth.emailVerified', req.locale),
    });
  });

  /**
   * GET /api/auth/sessions
   * Get all active sessions for current user
   */
  getSessions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const sessions = await AuthService.getUserSessions(userId);

    res.status(200).json({
      success: true,
      data: { sessions },
    });
  });

  /**
   * DELETE /api/auth/sessions/:sessionId
   * Revoke a specific session
   */
  revokeSession = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    await AuthService.revokeSession(userId, sessionId as string);

    res.status(200).json({
      success: true,
      message: t('auth.sessionRevoked', req.locale),
    });
  });

  /**
   * GET /api/auth/trusted-devices
   * List trusted devices for current user
   */
  getTrustedDevices = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { TrustedDeviceService } = await import('./trustedDevice.service');

    const devices = await TrustedDeviceService.listDevices(userId);

    res.status(200).json({ success: true, data: { devices } });
  });

  /**
   * DELETE /api/auth/trusted-devices/:token
   * Revoke a trusted device
   */
  revokeTrustedDevice = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { token } = req.params;
    const { TrustedDeviceService } = await import('./trustedDevice.service');

    await TrustedDeviceService.revokeDevice(userId, token as string);

    res.status(200).json({ success: true, message: t('auth.trustedDeviceRevoked', req.locale) });
  });

  /**
   * GET /api/auth/trusted-device/status
   * Check whether the current browser/device is trusted
   */
  getTrustedDeviceStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const headerToken = (req.headers['x-trusted-device-token'] as string) || undefined;
    const cookieToken = getCookieValue(req.headers.cookie, 'trustedDeviceToken');
    const token = headerToken || cookieToken;

    if (!token) {
      res.status(200).json({
        success: true,
        data: {
          trusted: false,
          expiresAt: null,
        },
      });
      return;
    }

    const { TrustedDeviceService } = await import('./trustedDevice.service');
    const record = await TrustedDeviceService.verifyDeviceToken(token);

    if (!record) {
      res.status(200).json({
        success: true,
        data: {
          trusted: false,
          expiresAt: null,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        trusted: true,
        expiresAt: record.expiresAt,
      },
    });
  });

  /**
   * Send OTP for 2FA
   */
  sendOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, method = 'EMAIL' } = req.body;

    await AuthService.sendOTP(userId, method);

    res.status(200).json({
      success: true,
      message: t('auth.otpSent', req.locale, { method: method.toLowerCase() }),
    });
  });

  /**
   * Verify OTP for 2FA
   */
  verifyOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId, code, otpSessionToken, rememberDevice } = req.body;
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const result = await AuthService.verifyOTPAndGetTokens(
      userId,
      code,
      otpSessionToken,
      deviceInfo,
      Boolean(rememberDevice)
    );

    if (result.trustedDeviceToken) {
      res.cookie('trustedDeviceToken', result.trustedDeviceToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: env.isProduction ? 'none' : 'lax', // Use 'lax' in development so frontend can send cookie across localhost origins
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    res.status(200).json({
      success: true,
      message: t('auth.twoFaSuccess', req.locale),
      data: result,
    });
  });

  /**
   * Verify OTP for forced email verification flow
   */
  verifyEmailOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: VerifyEmailOtpRequest = req.body;

    await AuthService.verifyEmailVerificationOtp(data, req.locale);

    res.status(200).json({
      success: true,
      message: t('auth.emailVerifiedLogin', req.locale),
    });
  });

  /**
   * Resend OTP for forced email verification flow
   */
  resendEmailVerificationOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ResendEmailVerificationOtpRequest = req.body;

    const result = await AuthService.resendEmailVerificationOtp(data, req.locale);

    res.status(200).json({
      success: true,
      message: t('auth.newVerificationCodeSent', req.locale),
      data: result,
    });
  });

  /**
   * Change email while pending verification and send new OTP
   */
  changeVerificationEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: ChangeVerificationEmailRequest = req.body;

    const result = await AuthService.changeVerificationEmail(data, req.locale);

    res.status(200).json({
      success: true,
      message: t('auth.emailUpdatedVerificationSent', req.locale),
      data: result,
    });
  });

  /**
   * POST /api/auth/signup/initiate
   * Step 1: Validate data, send OTP. User NOT created yet.
   */
  initiateRegistration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const locale = (req as any).locale || 'en';
    const data: InitiateRegistrationRequest = req.body;

    const result = await AuthService.initiateRegistration(data, locale);

    res.status(200).json({
      success: true,
      message: t('auth.registrationOtpSent', locale).replace('{{email}}', result.email),
      data: result,
    });
  });

  /**
   * POST /api/auth/signup/verify-otp
   * Step 2: Verify OTP → create user → mark email verified.
   */
  verifyRegistrationOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const locale = (req as any).locale || 'en';
    const data: VerifyRegistrationOtpRequest = req.body;

    await AuthService.verifyRegistrationOtp(data, locale);

    res.status(200).json({
      success: true,
      message: t('auth.registrationOtpVerified', locale),
    });
  });

  /**
   * POST /api/auth/signup/resend-otp
   * Resend OTP with rate limiting.
   */
  resendRegistrationOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const locale = (req as any).locale || 'en';
    const data: ResendRegistrationOtpRequest = req.body;

    const result = await AuthService.resendRegistrationOtp(data, locale);

    res.status(200).json({
      success: true,
      message: t('auth.registrationResendSuccess', locale).replace('{{email}}', result.email),
      data: result,
    });
  });
}

export default new AuthController();
