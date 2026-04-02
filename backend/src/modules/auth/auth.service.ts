/**
 * Enhanced Authentication Service
 * Production-ready auth with all enterprise features
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import { TokenService, type DeviceInfo } from './token.service';
import { emailService } from '@/common/services/email.service';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} from '@/common/errors/api.error';
import { AuditService } from '@/common/services/audit.service';
import { logger } from '@/common/logger/logger';
import { UserRole } from '@/types/rbac.types';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from './auth.types';

type SanitizedAuthUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date | null;
  profile?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    phone?: string;
    companyName?: string;
    profileImage?: string;
    locale?: string;
  };
};

/**
 * Authentication Service Class
 */
// Simple in-memory cache for security settings (TTL: 5 minutes)
let _secSettingsCache: { value: { maxLoginAttempts: number; lockDurationMinutes: number; passwordMinLength: number; forceStrongPasswords: boolean }; expiresAt: number } | null = null;

export class AuthService {
  // Constants
  private static readonly SALT_ROUNDS = 10;
  private static readonly RESET_TOKEN_EXPIRY_MINUTES = 15;
  private static readonly VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

  private static hasUsableEmailConfig(): boolean {
    const provider = (env.EMAIL_PROVIDER || 'smtp').toLowerCase();

    if (provider === 'smtp') {
      const user = (env.SMTP_USER || '').trim();
      const pass = (env.SMTP_PASSWORD || '').trim();
      const hasPlaceholders =
        user === 'your-email@gmail.com' || pass === 'your-email-password';
      return !!user && !!pass && !hasPlaceholders;
    }

    if (provider === 'sendgrid') {
      return !!(env.SENDGRID_API_KEY || '').trim();
    }

    if (provider === 'ses') {
      return !!(env.AWS_SES_ACCESS_KEY || '').trim() && !!(env.AWS_SES_SECRET_KEY || '').trim();
    }

    return false;
  }

  private static shouldBypassEmailFlows(): boolean {
    // Explicit override for temporary non-email testing on deployed environments.
    if (process.env.AUTH_BYPASS_EMAIL === 'true') {
      return true;
    }

    // Explicit hard-disable for environments that must enforce normal flow.
    if (process.env.AUTH_BYPASS_EMAIL === 'false') {
      return false;
    }

    // Auto-bypass when email delivery is not configured/usable.
    // This avoids blocking authentication with "Please verify your email".
    if (!this.hasUsableEmailConfig()) {
      return true;
    }

    // Enabled by default in development when email isn't configured.
    const bypassEnabled = process.env.AUTH_DEV_BYPASS_EMAIL !== 'false';
    return env.isDevelopment && bypassEnabled;
  }

  /**
   * Load security settings from DB (with safe defaults if not configured)
   */
  private static async getSecuritySettings() {
    const now = Date.now();
    if (_secSettingsCache && now < _secSettingsCache.expiresAt) {
      return _secSettingsCache.value;
    }
    try {
      const s = await prisma.systemSettings.findUnique({ where: { id: 'CURRENT' } });
      const value = {
        maxLoginAttempts: s?.maxLoginAttempts ?? 5,
        lockDurationMinutes: s?.accountLockDurationMinutes ?? 30,
        passwordMinLength: s?.passwordMinLength ?? 8,
        forceStrongPasswords: s?.forceStrongPasswords ?? true,
      };
      _secSettingsCache = { value, expiresAt: now + 5 * 60 * 1000 };
      return value;
    } catch {
      return { maxLoginAttempts: 5, lockDurationMinutes: 30, passwordMinLength: 8, forceStrongPasswords: true };
    }
  }

  /**
   * 1️⃣ USER REGISTRATION (SIGNUP)
   */
  static async register(data: RegisterRequest): Promise<{
    user: SanitizedAuthUser;
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

      // Validate password strength against admin-configured rules
      await this.validatePasswordWithSettings(data.password);

      // Hash password with bcrypt
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      const bypassEmailFlows = this.shouldBypassEmailFlows();

      // Generate email verification token when email delivery is enabled
      let verificationToken: string | null = null;
      let verificationTokenExpiry: Date | null = null;
      if (!bypassEmailFlows) {
        verificationToken = crypto.randomBytes(32).toString('hex');
        verificationTokenExpiry = new Date();
        verificationTokenExpiry.setHours(
          verificationTokenExpiry.getHours() + this.VERIFICATION_TOKEN_EXPIRY_HOURS
        );
      }

      // Create user with profile (transaction)
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role || 'USER',
          status: bypassEmailFlows ? 'ACTIVE' : 'PENDING',
          emailVerified: bypassEmailFlows,
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

      // NEW: Audit Log for User Registration
      await AuditService.log({
        userId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: user.id,
      }).catch(err => logger.error('Audit Log failed for registration:', err));

      // NEW: Trigger notification for new supplier (Audit requirement)
      if (user.role === 'SUPPLIER') {
        try {
          const NotificationService = (await import('../notification/notification.service')).default;
          await NotificationService.notify({
            type: 'NEW_USER_CREATED',
            title: 'New Supplier registered',
            message: `A new supplier "${user.profile?.fullName || user.email}" has registered and is pending approval.`,
            module: 'USER',
            triggeredById: user.id,
            relatedId: user.id,
            global: true
          });
        } catch (err) {
            logger.error('Failed to create notification for new supplier:', err);
        }
      }

      // Generate tokens
      const deviceInfo: DeviceInfo = {
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
      };

      const tokens = await TokenService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          preferredLanguage: user.profile?.preferredLanguage || 'en',
        },
        deviceInfo
      );

      // Return sanitized user
      const sanitizedUser = this.sanitizeUser(user);

      if (bypassEmailFlows) {
        logger.warn('DEV MODE: Email delivery unavailable, auto-verified newly registered account', {
          email: user.email,
        });
      } else {
        // Send welcome and verification emails in the background so slow SMTP
        // does not delay or fail the registration HTTP response.
        const displayName = user.profile?.fullName || 'User';
        void Promise.allSettled([
          emailService.sendWelcomeEmail(user.email, displayName),
          emailService.sendVerificationEmail(user.email, displayName, verificationToken as string),
        ]).then((results) => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              logger.error('Background registration email failed', {
                email: user.email,
                type: index === 0 ? 'welcome' : 'verification',
                error: result.reason,
              });
            }
          });
        });
      }

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
  ): Promise<AuthResponse> {
    try {
      logger.info(`Login attempt for: ${data.email.toLowerCase()}`);
      // Find user by email
      let user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          emailVerified: true,
          lockedUntil: true,
          failedLoginAttempts: true,
          passwordHash: true,
          lastLoginAt: true,
          profile: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              phoneNumber: true,
              address: true,
              companyName: true,
              preferredLanguage: true,
              profileImage: true,
            },
          },
        },
      });

      if (!user) {
        logger.warn(`Login failed: User not found - ${data.email.toLowerCase()}`);
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
        logger.warn(`Login failed: Account inactive - ${user.email}`);
        throw new UnauthorizedError('Account has been deactivated');
      }

      if (user.role === 'USER' && !user.emailVerified) {
        if (this.shouldBypassEmailFlows()) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: true,
              status: 'ACTIVE',
              verificationToken: null,
              verificationTokenExpiry: null,
            },
          });
          user = { ...user, emailVerified: true, status: 'ACTIVE' };
          logger.warn(`DEV MODE: auto-verified user at login because email delivery is unavailable - ${user.email}`);
        } else {
          logger.warn(`Login failed: Email not verified - ${user.email}`);
          throw new UnauthorizedError('Please verify your email before logging in');
        }
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

      if (!isPasswordValid) {
        logger.warn(`Login failed: Invalid password - ${user.email}`);
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
          lastLoginIp: deviceInfo?.ipAddress,
        },
      });

      // Fire-and-forget audit log — do not await; keeps login response fast
      AuditService.log({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: deviceInfo?.ipAddress,
      }).catch(err => logger.error('Audit Log failed for login:', err));

      // ⚠️ SECURITY: Enforce mandatory 2FA for Admin and Super Admin users
      // They must complete OTP verification before receiving final access tokens
      if ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && !this.shouldBypassEmailFlows()) {
        logger.info(`Admin/Super Admin login requires 2FA: ${user.email}`);

        // Generate a temporary session token for 2FA verification (short-lived, OTP-only)
        // This token can only be used with /api/auth/verify-otp endpoint
        const tempOtpToken = crypto.randomBytes(32).toString('hex');
        await prisma.$executeRaw`
          UPDATE users
          SET otp_session_token = ${tempOtpToken}
          WHERE id = ${user.id}
        `.catch((err: unknown) => logger.error('Failed to store OTP session token:', err));

        // Deliver the OTP in the background so the login response is immediate.
        void this.sendOTP(user.id, 'EMAIL').catch((err: unknown) =>
          logger.error('Background OTP delivery failed:', err)
        );

        return {
          user: this.sanitizeUser(user),
          tokens: {
            accessToken: '', // Empty, pending 2FA
            refreshToken: '' // Empty, pending 2FA
          },
          requiresTwoFactor: true, // Signal frontend that 2FA is required
          otpSessionToken: tempOtpToken // Temporary token to use with verify-otp
        };
      }

      if ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && this.shouldBypassEmailFlows()) {
        logger.warn(`DEV MODE: bypassed mandatory 2FA because email delivery is unavailable - ${user.email}`);
      }

      // Generate tokens with device info (regular users skip 2FA)
      const tokens = await TokenService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          preferredLanguage: user.profile?.preferredLanguage || 'en',
        },
        deviceInfo
      );

      logger.info(`User logged in: ${user.email}`);

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

      // Fire-and-forget audit log
      this.createAuditLog(userId, 'LOGOUT', 'User logged out');

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

      // Fire-and-forget audit log
      this.createAuditLog(userId, 'LOGOUT_ALL', 'User logged out from all devices');

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
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              fullName: true,
            },
          },
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
   * Resend email verification link
   */
  static async resendVerificationEmail(email: string): Promise<{ bypassed: boolean }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          profile: {
            select: {
              fullName: true,
            },
          },
        },
      });

      // Do not reveal whether user exists
      if (!user) {
        logger.warn(`Resend verification requested for non-existent email: ${email}`);
        return { bypassed: false };
      }

      // If already verified, silently succeed
      if (user.emailVerified) {
        logger.info(`Resend verification skipped for already verified email: ${user.email}`);
        return { bypassed: false };
      }

      if (this.shouldBypassEmailFlows()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: true,
            status: 'ACTIVE',
            verificationToken: null,
            verificationTokenExpiry: null,
          },
        });
        logger.warn(`DEV MODE: auto-verified via resend endpoint because email delivery is unavailable: ${user.email}`);
        return { bypassed: true };
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(
        verificationTokenExpiry.getHours() + this.VERIFICATION_TOKEN_EXPIRY_HOURS
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken,
          verificationTokenExpiry,
        },
      });

      const fullName = user.profile?.fullName || 'User';
      await emailService.sendVerificationEmail(user.email, fullName, verificationToken);

      await this.createAuditLog(
        user.id,
        'EMAIL_VERIFICATION_RESENT',
        'Verification email link was resent'
      );

      return { bypassed: false };
    } catch (error) {
      logger.error('Resend verification email error:', error);
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

      // Validate new password against admin-configured rules
      await this.validatePasswordWithSettings(data.newPassword);

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
        select: {
          id: true,
          email: true,
          passwordHash: true,
          profile: {
            select: {
              fullName: true,
            },
          },
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

      // Validate new password against admin-configured rules
      await this.validatePasswordWithSettings(data.newPassword);

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
  static async getCurrentUser(userId: string): Promise<SanitizedAuthUser> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              phoneNumber: true,
              address: true,
              companyName: true,
              preferredLanguage: true,
              profileImage: true,
            },
          },
        },
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

      // Fire-and-forget audit log
      this.createAuditLog(userId, 'SESSION_REVOKED', 'User revoked a session', { sessionId }).catch(
        (err) => logger.error('Audit log failed for session revocation:', err)
      );

      logger.info(`Session revoked: ${sessionId} for user: ${userId}`);
    } catch (error) {
      logger.error('Revoke session error:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate Password Strength (async — reads settings from DB)
   */
  private static async validatePasswordWithSettings(password: string): Promise<void> {
    const { passwordMinLength, forceStrongPasswords } = await this.getSecuritySettings();
    this.validatePasswordStrength(password, passwordMinLength, forceStrongPasswords);
  }

  /**
   * Validate Password Strength (sync core — called with explicit settings)
   */
  private static validatePasswordStrength(
    password: string,
    minLength = 8,
    forceStrong = true
  ): void {
    if (password.length < minLength) {
      throw new BadRequestError(`Password must be at least ${minLength} characters long`);
    }

    if (forceStrong) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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
  }

  /**
   * Handle Failed Login Attempts (reads maxLoginAttempts + lockDuration from DB)
   */
  private static async handleFailedLogin(
    userId: string,
    currentAttempts: number
  ): Promise<void> {
    const { maxLoginAttempts, lockDurationMinutes } = await this.getSecuritySettings();
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= maxLoginAttempts) {
      // Lock account
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + lockDurationMinutes);

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      logger.warn(`Account locked due to failed login attempts: ${userId}`);

      // Fire-and-forget audit log
      this.createAuditLog(userId, 'ACCOUNT_LOCKED', 'Account locked due to failed login attempts');
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
  private static sanitizeUser<T extends Record<string, unknown>>(user: T): SanitizedAuthUser {
    const { passwordHash, resetToken, resetTokenExpiry, verificationToken, ...sanitized } = user as unknown as {
      passwordHash?: unknown;
      resetToken?: unknown;
      resetTokenExpiry?: unknown;
      verificationToken?: unknown;
      id: string;
      email: string;
      role: string;
      status?: string;
      isActive?: boolean;
      emailVerified?: boolean;
      profile?: {
        fullName?: string;
        phoneNumber?: string | null;
        companyName?: string | null;
        profileImage?: string | null;
        preferredLanguage?: string;
      } | null;
    };

    const [firstName = '', ...restName] = (sanitized.profile?.fullName || '').trim().split(' ');
    const lastName = restName.join(' ').trim();

    return {
      id: sanitized.id,
      email: sanitized.email,
      role: sanitized.role,
      status: sanitized.status || 'ACTIVE',
      isActive: sanitized.isActive ?? true,
      emailVerified: sanitized.emailVerified ?? false,
      profile: sanitized.profile
        ? {
            fullName: sanitized.profile.fullName || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            phoneNumber: sanitized.profile.phoneNumber || undefined,
            phone: sanitized.profile.phoneNumber || undefined,
            companyName: sanitized.profile.companyName || undefined,
            profileImage: sanitized.profile.profileImage || undefined,
            locale: sanitized.profile.preferredLanguage || undefined,
          }
        : undefined,
    };
  }

  /**
   * Create Audit Log
   */
  private static async createAuditLog(
    userId: string,
    action: string,
    description: string,
    metadata?: Record<string, unknown>
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

  /**
   * Send OTP for 2FA
   */
  static async sendOTP(userId: string, method: 'EMAIL' | 'SMS' = 'EMAIL'): Promise<void> {
    try {
      const { TwoFactorService } = await import('./twofa.service');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, id: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const { otp } = await TwoFactorService.createOTP(userId, method);

      if (method === 'EMAIL') {
        await TwoFactorService.sendOTPEmail(user.email, otp);
      }
      // TODO: Implement SMS sending when SMS service is available

      logger.info(`OTP sent to user ${userId} via ${method}`);
    } catch (error) {
      logger.error('Error sending OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and get token pair
   */
  static async verifyOTPAndGetTokens(
    userId: string,
    code: string,
    otpSessionToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<{
    user: SanitizedAuthUser;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      const { TwoFactorService } = await import('./twofa.service');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              id: true,
              userId: true,
              fullName: true,
              phoneNumber: true,
              address: true,
              companyName: true,
              preferredLanguage: true,
              profileImage: true,
            },
          },
          otpSessionToken: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!otpSessionToken || user.otpSessionToken !== otpSessionToken) {
        throw new UnauthorizedError('Invalid or expired two-factor session');
      }

      await TwoFactorService.verifyOTP(userId, code);

      await prisma.user.update({
        where: { id: userId },
        data: { otpSessionToken: null },
      });

      const tokens = await TokenService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          preferredLanguage: user.profile?.preferredLanguage || 'en',
        },
        deviceInfo
      );

      AuditService.log({
        userId: user.id,
        action: 'USER_2FA_VERIFIED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: deviceInfo?.ipAddress,
      }).catch((err) => logger.error('Audit log failed for 2FA:', err));

      logger.info(`2FA verification successful for user ${userId}`);

      return {
        user: this.sanitizeUser(user),
        tokens,
      };
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }
}
