/**
 * Two-Factor Authentication Service
 * OTP generation, verification, and management with lockout protection
 */

import crypto from 'crypto';
import { prisma } from '@/config/database';
import { emailService } from '@/common/services/email.service';
import { logger } from '@/common/logger/logger';
import { BadRequestError, TooManyRequestsError } from '@/common/errors/api.error';
import { t } from '@/common/i18n';

export const OTP_CONFIG = {
  LENGTH: 6,
  NUMERIC_ONLY: true,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
  RATE_LIMIT_MINUTES: 15,
} as const;

export class TwoFactorService {
  static generateOTP(length: number = OTP_CONFIG.LENGTH): string {
    if (OTP_CONFIG.NUMERIC_ONLY) {
      return crypto
        .randomInt(0, Math.pow(10, length))
        .toString()
        .padStart(length, '0');
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return otp;
  }

  /**
   * Create OTP. Throws TooManyRequestsError if the user has an active lockout.
   */
  static async createOTP(
    userId: string,
    method: 'EMAIL' | 'SMS' = 'EMAIL',
    locale: string = 'en',
  ): Promise<{ otp: string; expiresAt: Date }> {
    try {
      // Check for active lockout before deleting existing OTP
      const existing = await prisma.twoFactorOTP.findUnique({ where: { userId } });
      if (existing?.lockedUntil && existing.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (existing.lockedUntil.getTime() - Date.now()) / 60_000,
        );
        throw new TooManyRequestsError(
          t('common.rateLimitMinutes', locale, { minutes: minutesRemaining }),
          { lockedUntil: existing.lockedUntil.toISOString() },
        );
      }

      // Delete any existing OTP (not locked)
      await prisma.twoFactorOTP.deleteMany({ where: { userId } });

      const otp = this.generateOTP();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

      await prisma.twoFactorOTP.create({
        data: { userId, code: otp, method, expiresAt, attempts: 0 },
      });

      logger.info(`OTP created for user ${userId} via ${method}`);
      return { otp, expiresAt };
    } catch (error) {
      logger.error('Error creating OTP:', error);
      throw error;
    }
  }

  static async sendOTPEmail(email: string, otp: string): Promise<void> {
    try {
      const html = `
        <h2>Your Two-Factor Authentication Code</h2>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This code will expire in ${OTP_CONFIG.EXPIRY_MINUTES} minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `;
      const sent = await emailService.sendEmail({
        to: email,
        subject: 'Your Two-Factor Authentication Code',
        html,
      });
      if (!sent) {
        throw new BadRequestError('Unable to deliver OTP email. Please try again later.');
      }
      logger.info(`OTP email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      throw error;
    }
  }

  /**
   * Verify OTP with attempt tracking and lockout.
   */
  static async verifyOTP(
    userId: string,
    code: string,
    locale: string = 'en',
  ): Promise<boolean> {
    try {
      const otpRecord = await prisma.twoFactorOTP.findUnique({ where: { userId } });

      if (!otpRecord) {
        throw new BadRequestError(t('auth.forgotPasswordOtpNotFound', locale));
      }

      // Check active lockout first
      if (otpRecord.lockedUntil && otpRecord.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (otpRecord.lockedUntil.getTime() - Date.now()) / 60_000,
        );
        throw new TooManyRequestsError(
          t('common.rateLimitMinutes', locale, { minutes: minutesRemaining }),
          { lockedUntil: otpRecord.lockedUntil.toISOString() },
        );
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        await prisma.twoFactorOTP.delete({ where: { userId } });
        throw new BadRequestError(t('auth.forgotPasswordOtpExpired', locale));
      }

      // Check attempt limit (handles edge case of expired lockout but high attempts)
      if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        throw new BadRequestError(t('auth.forgotPasswordOtpMaxAttempts', locale));
      }

      // Verify OTP code
      if (otpRecord.code !== code) {
        const newAttempts = otpRecord.attempts + 1;
        let lockedUntil: Date | undefined;

        if (newAttempts >= OTP_CONFIG.MAX_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + OTP_CONFIG.RATE_LIMIT_MINUTES * 60_000);
        }

        await prisma.twoFactorOTP.update({
          where: { userId },
          data: { attempts: newAttempts, ...(lockedUntil ? { lockedUntil } : {}) },
        });

        if (lockedUntil) {
          throw new TooManyRequestsError(
            t('common.rateLimitMinutes', locale, { minutes: OTP_CONFIG.RATE_LIMIT_MINUTES }),
            { lockedUntil: lockedUntil.toISOString() },
          );
        }

        const attemptsLeft = OTP_CONFIG.MAX_ATTEMPTS - newAttempts;
        throw new BadRequestError(
          t('auth.forgotPasswordOtpInvalid', locale, { count: attemptsLeft }),
        );
      }

      // OTP verified — delete the record
      await prisma.twoFactorOTP.delete({ where: { userId } });
      logger.info(`OTP verified successfully for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw error;
    }
  }

  static async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!user) return false;
      return ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
    } catch (error) {
      logger.error('Error checking 2FA status:', error);
      return false;
    }
  }

  static async getRemainingAttempts(userId: string): Promise<number> {
    try {
      const otpRecord = await prisma.twoFactorOTP.findUnique({
        where: { userId },
        select: { attempts: true },
      });
      if (!otpRecord) return OTP_CONFIG.MAX_ATTEMPTS;
      return Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts);
    } catch (error) {
      logger.error('Error getting OTP attempts:', error);
      return 0;
    }
  }

  static async cleanupExpiredOTPs(): Promise<number> {
    try {
      const result = await prisma.twoFactorOTP.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`Cleaned up ${result.count} expired OTPs`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }
}
