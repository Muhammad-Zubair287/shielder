/**
 * Enhanced Authentication Controller
 * Production-ready HTTP handlers for all auth endpoints
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { asyncHandler } from '@/common/utils/helpers';
import type { AuthRequest } from '@/types/global';
import type {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  DeviceInfo,
} from './auth.types';

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

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
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
    const deviceInfo: DeviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
    };

    const result = await AuthService.login(data, deviceInfo);

    res.status(200).json({
      success: true,
      message: 'Login successful',
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
        message: 'Refresh token is required',
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
      message: 'Tokens refreshed successfully',
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
        message: 'Refresh token is required',
      });
      return;
    }

    await AuthService.logout(userId, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
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
      message: 'Logged out from all devices successfully',
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
      message: 'If the email exists, a password reset link has been sent',
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
      message: 'Password reset successful. Please login with your new password.',
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
      message: 'Password changed successfully. Please login again on all devices.',
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

    await AuthService.verifyEmail(token as string);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
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
      message: 'Session revoked successfully',
    });
  });
}

export default new AuthController();
