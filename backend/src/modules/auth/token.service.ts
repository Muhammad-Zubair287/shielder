/**
 * Token Service
 * Professional token management with rotation & revocation
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { UnauthorizedError } from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';
import { UserRole } from '../../types/rbac.types';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  preferredLanguage?: string;
}

/**
 * Token Pair Interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Device Info Interface
 */
export interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Token Service Class
 * Handles all token operations: generation, verification, rotation, revocation
 */
export class TokenService {
  // Token expiration times
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

  /**
   * Generate Access Token (Short-lived)
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'shielder-api',
      audience: 'shielder-client',
    });
  }

  /**
   * Generate Refresh Token (Long-lived)
   * Returns raw token (before hashing)
   */
  static generateRefreshToken(): string {
    // Generate cryptographically secure random token
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash Token (for storage)
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store Refresh Token in Database
   */
  static async storeRefreshToken(
    userId: string,
    refreshToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

      await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          deviceInfo: deviceInfo?.userAgent,
          ipAddress: deviceInfo?.ipAddress,
          expiresAt,
        },
      });

      logger.info(`Refresh token stored for user ${userId}`);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Generate Token Pair (Access + Refresh)
   */
  static async generateTokenPair(
    user: JWTPayload,
    deviceInfo?: DeviceInfo
  ): Promise<TokenPair> {
    // Generate access token
    const accessToken = this.generateAccessToken(user);

    // Generate refresh token
    const refreshToken = this.generateRefreshToken();

    // Store refresh token (hashed)
    await this.storeRefreshToken(user.userId, refreshToken, deviceInfo);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, env.jwt.secret, {
        issuer: 'shielder-api',
        audience: 'shielder-client',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid access token');
      }
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Verify Refresh Token
   * Returns user payload if valid
   */
  static async verifyRefreshToken(refreshToken: string): Promise<JWTPayload> {
    try {
      const tokenHash = this.hashToken(refreshToken);

      // Find token in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { profile: true } } },
      });

      // Validate token exists
      if (!storedToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Check if revoked
      if (storedToken.isRevoked) {
        logger.warn(`Attempted use of revoked refresh token: ${storedToken.id}`);
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      // Check if expired
      if (new Date() > storedToken.expiresAt) {
        // Auto-revoke expired token
        await this.revokeToken(tokenHash, 'expired');
        throw new UnauthorizedError('Refresh token expired');
      }

      // Check if user is active
      if (!storedToken.user.isActive) {
        throw new UnauthorizedError('User account is inactive');
      }

      // Return user payload
      return {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role as UserRole,
        preferredLanguage: storedToken.user.profile?.preferredLanguage || 'en',
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      logger.error('Refresh token verification error:', error);
      throw new UnauthorizedError('Token verification failed');
    }
  }

  /**
   * Rotate Refresh Token
   * Invalidates old token and issues new pair
   */
  static async rotateRefreshToken(
    oldRefreshToken: string,
    deviceInfo?: DeviceInfo
  ): Promise<TokenPair> {
    try {
      // Verify old refresh token
      const userPayload = await this.verifyRefreshToken(oldRefreshToken);

      // Revoke old refresh token
      const oldTokenHash = this.hashToken(oldRefreshToken);
      await this.revokeToken(oldTokenHash, 'rotated');

      // Generate new token pair
      const newTokens = await this.generateTokenPair(userPayload, deviceInfo);

      logger.info(`Refresh token rotated for user ${userPayload.userId}`);

      return newTokens;
    } catch (error) {
      logger.error('Token rotation error:', error);
      throw error;
    }
  }

  /**
   * Revoke Refresh Token
   */
  static async revokeToken(tokenHash: string, reason: string): Promise<void> {
    try {
      await prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      logger.info(`Refresh token revoked: ${reason}`);
    } catch (error) {
      logger.error('Error revoking token:', error);
      throw error;
    }
  }

  /**
   * Revoke All User Tokens (Logout from all devices)
   */
  static async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      logger.info(`All tokens revoked for user ${userId}: ${reason}`);
    } catch (error) {
      logger.error('Error revoking all tokens:', error);
      throw error;
    }
  }

  /**
   * Clean Expired Tokens (Maintenance task)
   */
  static async cleanExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              isRevoked: true,
              revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
            },
          ],
        },
      });

      logger.info(`Cleaned ${result.count} expired/old refresh tokens`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning expired tokens:', error);
      throw error;
    }
  }

  /**
   * Get Active Sessions for User
   */
  static async getUserActiveSessions(userId: string) {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          createdAt: true,
          expiresAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sessions;
    } catch (error) {
      logger.error('Error fetching user sessions:', error);
      throw error;
    }
  }
}
