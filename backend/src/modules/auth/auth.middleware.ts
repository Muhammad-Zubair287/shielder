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
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = {
      id: payload.userId,
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
      preferredLanguage: payload.preferredLanguage,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', error);
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Authorize user based on roles
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('You do not have permission to access this resource');
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
        preferredLanguage: payload.preferredLanguage,
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};
