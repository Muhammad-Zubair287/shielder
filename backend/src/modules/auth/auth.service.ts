/**
 * Enhanced Authentication Service
 * Production-ready auth with all enterprise features
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/config/database';
import { TokenService, type DeviceInfo } from './token.service';
import { emailService } from '@/common/services/email.service';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';
import type {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from './auth.types';

/**
 * Authentication Service Class
 */
export class AuthService {
  // Constants
  private static readonly SALT_ROUNDS = 12;
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCK_DURATION_MINUTES = 30;
  private static readonly RESET_TOKEN_EXPIRY_MINUTES = 15;
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

  /**
   * 1️⃣ USER REGISTRATION (SIGNUP)
   */
  static async register(data: RegisterRequest): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      // Validate email uniqueness
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Validate password strength
      this.validatePasswordStrength(data.password);

      // Hash password with bcrypt
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(
        verificationTokenExpiry.getHours() + this.VERIFICATION_TOKEN_EXPIRY_HOURS
      );

      // Create user with profile (transaction)
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role || 'USER',
          status: 'PENDING',
          verificationToken,
          verificationTokenExpiry,
          profile: {
            create: {
              fullName: data.fullName || '',
              phoneNumber: data.phoneNumber,
              address: data.address,
              companyName: data.companyName,
              preferredLanguage: data.preferredLanguage || 'en',
            },
          },
        },
        include: {
          profile: true,
        },
      });

      logger.info(`New user registered: ${user.email}`);

      // NEW: Trigger notification for new supplier
      if (user.role === 'SUPPLIER') {
        try {
          const { NotificationService } = require('../notification/notification.service');
          const { NotificationType, UserRole } = require('@prisma/client');
          
          await NotificationService.createNotification({
            type: NotificationType.NEW_SUPPLIER,
            title: 'New Supplier Registration',
            message: `A new supplier "${user.profile?.fullName || user.email}" has registered and is pending approval.`,
            roleTarget: UserRole.SUPER_ADMIN,
          });
        } catch (err) {
            logger.error('Failed to create notification for new supplier:', err);
        }
      }

      // Send welcome and verification emails
      const displayName = user.profile?.fullName || 'User';
      await Promise.all([
        emailService.sendWelcomeEmail(user.email, displayName),
        emailService.sendVerificationEmail(user.email, displayName, verificationToken),
      ]);

      // Generate tokens
      const deviceInfo: DeviceInfo = {
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      };

      const tokens = await TokenService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role as any,
          preferredLanguage: user.profile?.preferredLanguage || 'en',
        },
        deviceInfo
      );

      // Return sanitized user
      const sanitizedUser = this.sanitizeUser(user);

      return {
        user: sanitizedUser,
        tokens,
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * 2️⃣ USER LOGIN
   */
  static async login(
    data: LoginRequest,
    deviceInfo?: DeviceInfo
  ): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        include: { profile: true },
      });

      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check account lock
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        const minutesLeft = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        );
        throw new UnauthorizedError(
          `Account locked. Try again in ${minutesLeft} minutes.`
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedError('Account has been deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

      if (!isPasswordValid) {
        // Increment failed attempts
        await this.handleFailedLogin(user.id, user.failedLoginAttempts);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Reset failed attempts and update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        },
      });

      // Generate tokens with device info
      const tokens = await TokenService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role as any,
          preferredLanguage: user.profile?.preferredLanguage || 'en',
        },
        deviceInfo
      );

      logger.info(`User logged in: ${user.email}`);

      // Create audit log
      await this.createAuditLog(user.id, 'LOGIN', 'User logged in successfully', {
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
      });

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * 3️⃣ REFRESH TOKEN FLOW
   */
  static async refreshTokens(
    refreshToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Rotate refresh token (validates + generates new pair)
      const tokens = await TokenService.rotateRefreshToken(refreshToken, deviceInfo);

      logger.info('Tokens refreshed successfully');

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * 4️⃣ LOGOUT
   */
  static async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Revoke specific refresh token
      const tokenHash = TokenService.hashToken(refreshToken);
      await TokenService.revokeToken(tokenHash, 'logout');

      // Create audit log
      await this.createAuditLog(userId, 'LOGOUT', 'User logged out');

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * 4️⃣-B LOGOUT FROM ALL DEVICES
   */
  static async logoutAll(userId: string): Promise<void> {
    try {
      // Revoke all refresh tokens for user
      await TokenService.revokeAllUserTokens(userId, 'logout_all');

      // Create audit log
      await this.createAuditLog(userId, 'LOGOUT_ALL', 'User logged out from all devices');

      logger.info(`User logged out from all devices: ${userId}`);
    } catch (error) {
      logger.error('Logout all error:', error);
      throw error;
    }
  }

  /**
   * 5️⃣ FORGOT PASSWORD
   */
  static async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        include: {
          profile: true,
        },
      });

      // Don't reveal if email exists (security best practice)
      if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${data.email}`);
        return; // Silently succeed
      }

      // Generate secure reset token (PLAIN - not hashed yet)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Set expiry
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setMinutes(
        resetTokenExpiry.getMinutes() + this.RESET_TOKEN_EXPIRY_MINUTES
      );

      // Store hashed token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetTokenHash,
          resetTokenExpiry,
        },
      });

      logger.info(`Password reset token generated for: ${user.email}`);

      // Send password reset email with PLAIN token
      const fullName = user.profile?.fullName || 'User';
      await emailService.sendPasswordResetEmail(user.email, fullName, resetToken);

      // Create audit log
      await this.createAuditLog(user.id, 'PASSWORD_RESET_REQUESTED', 'Password reset requested');
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * 6️⃣ RESET PASSWORD
   */
  static async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      // Hash the provided token
      const resetTokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: resetTokenHash,
          resetTokenExpiry: { gt: new Date() }, // Not expired
        },
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Validate new password
      this.validatePasswordStrength(data.newPassword);

      // Hash new password
      const passwordHash = await bcrypt.hash(data.newPassword, this.SALT_ROUNDS);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
          lastPasswordChange: new Date(),
        },
      });

      // Revoke all existing refresh tokens (force re-login)
      await TokenService.revokeAllUserTokens(user.id, 'password_reset');

      logger.info(`Password reset successful for: ${user.email}`);

      // Create audit log
      await this.createAuditLog(user.id, 'PASSWORD_RESET', 'Password was reset');

      // TODO: Send password changed notification email
      // await EmailService.sendPasswordChangedEmail(user.email);
    } catch (error) {
      logger.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * 7️⃣ CHANGE PASSWORD (Authenticated)
   */
  static async changePassword(userId: string, data: ChangePasswordRequest): Promise<void> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(data.oldPassword, user.passwordHash);

      if (!isOldPasswordValid) {
        throw new BadRequestError('Current password is incorrect');
      }

      // Validate new password
      this.validatePasswordStrength(data.newPassword);

      // Ensure new password is different
      const isSamePassword = await bcrypt.compare(data.newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestError('New password must be different from current password');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.newPassword, this.SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          lastPasswordChange: new Date(),
        },
      });

      // Revoke all existing refresh tokens (force re-login on all devices)
      await TokenService.revokeAllUserTokens(userId, 'password_change');

      logger.info(`Password changed for user: ${user.email}`);

      // Send password changed notification email
      const fullName = user.profile?.fullName || 'User';
      await emailService.sendPasswordChangedEmail(user.email, fullName);

      // Create audit log
      await this.createAuditLog(userId, 'PASSWORD_CHANGED', 'User changed their password');
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Get Current User
   */
  static async getCurrentUser(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account has been deactivated');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      logger.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Verify Email
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired verification token');
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: 'ACTIVE',
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });

      logger.info(`Email verified for user: ${user.email}`);

      await this.createAuditLog(user.id, 'EMAIL_VERIFIED', 'Email address verified');
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Get User Active Sessions
   */
  static async getUserSessions(userId: string) {
    try {
      const sessions = await TokenService.getUserActiveSessions(userId);
      return sessions;
    } catch (error) {
      logger.error('Get user sessions error:', error);
      throw error;
    }
  }

  /**
   * Revoke Specific Session
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    try {
      const session = await prisma.refreshToken.findFirst({
        where: {
          id: sessionId,
          userId,
        },
      });

      if (!session) {
        throw new NotFoundError('Session not found');
      }

      await TokenService.revokeToken(session.tokenHash, 'user_revoked');

      logger.info(`Session revoked: ${sessionId} for user: ${userId}`);
    } catch (error) {
      logger.error('Revoke session error:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate Password Strength
   */
  private static validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new BadRequestError(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      throw new BadRequestError('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      throw new BadRequestError('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      throw new BadRequestError('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      throw new BadRequestError('Password must contain at least one special character');
    }
  }

  /**
   * Handle Failed Login Attempts
   */
  private static async handleFailedLogin(
    userId: string,
    currentAttempts: number
  ): Promise<void> {
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
      // Lock account
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + this.LOCK_DURATION_MINUTES);

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      logger.warn(`Account locked due to failed login attempts: ${userId}`);

      await this.createAuditLog(userId, 'ACCOUNT_LOCKED', 'Account locked due to failed login attempts');
    } else {
      // Increment attempts
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
        },
      });
    }
  }

  /**
   * Sanitize User (Remove sensitive data)
   */
  private static sanitizeUser(user: any) {
    const { passwordHash, resetToken, resetTokenExpiry, verificationToken, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Create Audit Log
   */
  private static async createAuditLog(
    userId: string,
    action: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          changes: { description, ...metadata },
        },
      });
    } catch (error) {
      logger.error('Error creating audit log:', error);
      // Don't throw - audit logs should not break main flow
    }
  }
}
