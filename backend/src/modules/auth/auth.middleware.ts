/**
 * Auth Middleware
 * Middleware for authentication and authorization
 */

import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../config/jwt';
import { UnauthorizedError, ForbiddenError } from '../../common/errors/api.error';
import { AuthRequest } from '../../types/global';
import { logger } from '../../common/logger/logger';
import { UserRole } from '../../types/rbac.types';
import { prisma } from '@/config/database';
import { tokenBlacklistService } from '@/common/services/token-blacklist.service';
import { t } from '@/common/i18n';

const verifyEmailStatusInternal = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError(t('auth.tokenRevoked', req.locale ?? 'en'));
    }

    const locale = req.locale ?? 'en';

    // ── 1. JTI blacklist check (Redis — O(1), no DB round-trip) ──────────────
    // If the token was explicitly revoked on logout it will be in Redis.
    if (req.user.jti) {
      const revoked = await tokenBlacklistService.isBlacklisted(req.user.jti);
      if (revoked) {
        throw new UnauthorizedError(t('auth.tokenRevoked', locale));
      }
    }

    // ── 2. DB check — user existence, soft-delete, active status ─────────────
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        role: true,
        deletedAt: true,
        isActive: true,
        tokenVersion: true,
        emailVerified: true,
        emailVerifiedAt: true,
        verificationStatus: true,
        requiresEmailReverification: true,
      },
    });

    if (!dbUser || dbUser.deletedAt || !dbUser.isActive) {
      throw new UnauthorizedError(t('auth.tokenRevoked', locale));
    }

    // ── 3. tokenVersion check — catches logoutAll and Redis-fallback logouts ──
    if ((req.user.tokenVersion ?? 0) !== dbUser.tokenVersion) {
      throw new UnauthorizedError(t('auth.tokenRevoked', locale));
    }

    // ── 4. Email verification check (USER role only) ──────────────────────────
    if (
      req.user.role === 'USER' &&
      (!dbUser.emailVerified ||
        !dbUser.emailVerifiedAt ||
        dbUser.verificationStatus !== 'VERIFIED' ||
        dbUser.requiresEmailReverification)
    ) {
      throw new UnauthorizedError('Email verification required. Please verify your email to continue.');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError(t('auth.tokenRevoked', req.locale ?? 'en'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user + token metadata to request
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      tokenVersion: payload.tokenVersion ?? 0,
      preferredLanguage: payload.preferredLanguage,
      jti: payload.jti,
      tokenExp: payload.exp,
    };

    await verifyEmailStatusInternal(req, _res, next);
  } catch (error) {
    logger.error('Authentication error', error);

    // Token library errors are intentionally locale-agnostic. Convert every
    // authentication failure at the HTTP boundary so all clients receive the
    // selected-language API message.
    next(new UnauthorizedError(t('auth.tokenRevoked', req.locale ?? 'en')));
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError(t('auth.tokenRevoked', req.locale ?? 'en'));
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(t('common.forbidden', req.locale ?? 'en'));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication
 * Attaches user if token is present, but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);

      req.user = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
        tokenVersion: payload.tokenVersion ?? 0,
        preferredLanguage: payload.preferredLanguage,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

export const verifyEmailStatus = verifyEmailStatusInternal;

export const AuthMiddleware = {
  authenticate,
  authorize,
  optionalAuth,
  verifyEmailStatus,
};
