/**
 * Two-Factor Authentication Service
 * OTP generation, verification, and management
 */

import crypto from 'crypto';
import { prisma } from '@/config/database';
import { emailService } from '@/common/services/email.service';
import { logger } from '@/common/logger/logger';
import { BadRequestError, UnauthorizedError } from '@/common/errors/api.error';

/**
 * OTP Configuration
 */
export const OTP_CONFIG = {
  LENGTH: 6,
  NUMERIC_ONLY: true,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
  RATE_LIMIT_MINUTES: 15,
} as const;

/**
 * 2FA Service Class
 */
export class TwoFactorService {
  /**
   * Generate OTP (6-digit numeric code)
   */
  static generateOTP(length: number = OTP_CONFIG.LENGTH): string {
    if (OTP_CONFIG.NUMERIC_ONLY) {
      // Generate numeric-only OTP
      return crypto
        .randomInt(0, Math.pow(10, length))
        .toString()
        .padStart(length, '0');
    }
    // Generate alphanumeric OTP
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return otp;
  }

  /**
   * Create OTP record for user
   */
  static async createOTP(userId: string, method: 'EMAIL' | 'SMS' = 'EMAIL'): Promise<{
    otp: string;
    expiresAt: Date;
  }> {
    try {
      // Delete any existing OTP for this user
      await prisma.twoFactorOTP.deleteMany({
        where: { userId },
      });

      // Generate OTP
      const otp = this.generateOTP();
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

      // Store OTP
      await prisma.twoFactorOTP.create({
        data: {
          userId,
          code: otp,
          method,
          expiresAt,
          attempts: 0,
        },
      });

      logger.info(`OTP created for user ${userId} via ${method}`);

      return { otp, expiresAt };
    } catch (error) {
      logger.error('Error creating OTP:', error);
      throw error;
    }
  }

  /**
   * Send OTP to user email
   */
  static async sendOTPEmail(
    email: string,
    otp: string
  ): Promise<void> {
    try {
      const html = `
        <h2>Your Two-Factor Authentication Code</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This code will expire in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `;

      await emailService.sendEmail({
        to: email,
        subject: 'Your Two-Factor Authentication Code',
        html,
      });

      logger.info(`OTP email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  static async verifyOTP(
    userId: string,
    code: string
  ): Promise<boolean> {
    try {
      // Get OTP record
      const otpRecord = await prisma.twoFactorOTP.findUnique({
        where: { userId },
      });

      if (!otpRecord) {
        throw new BadRequestError('No OTP found. Please request a new one.');
      }

      // Check if OTP expired
      if (new Date() > otpRecord.expiresAt) {
        // Delete expired OTP
        await prisma.twoFactorOTP.delete({
          where: { userId },
        });
        throw new BadRequestError('OTP expired. Please request a new one.');
      }

      // Check attempt limit
      if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        throw new UnauthorizedError(
          `Too many failed attempts. Please request a new OTP.`
        );
      }

      // Verify OTP code
      if (otpRecord.code !== code) {
        // Increment failed attempts
        await prisma.twoFactorOTP.update({
          where: { userId },
          data: { attempts: otpRecord.attempts + 1 },
        });

        throw new UnauthorizedError(
          `Invalid OTP. ${OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts - 1} attempts remaining.`
        );
      }

      // OTP verified - delete the record
      await prisma.twoFactorOTP.delete({
        where: { userId },
      });

      logger.info(`OTP verified successfully for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user) {
        return false;
      }

      // 2FA is mandatory for ADMIN and SUPER_ADMIN
      return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  /**
   * Get remaining OTP attempts
   */
  static async getRemainingAttempts(userId: string): Promise<number> {
    try {
      const otpRecord = await prisma.twoFactorOTP.findUnique({
        where: { userId },
        select: { attempts: true },
      });

      if (!otpRecord) {
        return OTP_CONFIG.MAX_ATTEMPTS;
      }

      return Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts);
    } catch (error) {
      logger.error('Error getting OTP attempts:', error);
      return 0;
    }
  }

  /**
   * Cleanup expired OTPs (run periodically)
   */
  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await prisma.twoFactorOTP.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result.count} expired OTPs`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }
}
