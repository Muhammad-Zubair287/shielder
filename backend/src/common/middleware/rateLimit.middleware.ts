/**
 * Rate Limiting Middleware
 * Protect against brute force and DDoS attacks
 */

import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '@/common/errors/api.error';
import { logger } from '@/common/logger/logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
  identifierFn?: (req: Request) => string;
}

// In-memory store for rate limiting
// TODO: Use Redis for production multi-server setup
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Test-only helper to isolate rate limiter state between test cases.
export const resetRateLimitStore = (): void => {
  rateLimitStore.clear();
};

/**
 * Clean up expired entries periodically
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

// Do not keep process alive solely for this interval (important for tests/shutdown).
cleanupInterval.unref();

/**
 * Rate Limit Middleware Factory
 */
export const rateLimitAuth = (config: RateLimitConfig) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (process.env.DISABLE_RATE_LIMIT === 'true') {
        next();
        return;
      }

      const identifier = config.identifierFn
        ? config.identifierFn(req)
        : req.ip || req.connection.remoteAddress || 'unknown';
      const key = `ratelimit:${req.path}:${identifier}`;
      const now = Date.now();
      const windowMs = config.windowMinutes * 60 * 1000;

      const record = rateLimitStore.get(key);

      if (!record || now > record.resetTime) {
        // Start new window
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + windowMs,
        });
        next();
        return;
      }

      if (record.count >= config.maxRequests) {
        const retryAfter = Math.ceil((record.resetTime - now) / 1000);
        logger.warn(`Rate limit exceeded for ${identifier} on ${req.path}`);
        throw new TooManyRequestsError(
          `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
        );
      }

      // Increment counter
      record.count++;
      rateLimitStore.set(key, record);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * General rate limiter
 */
export const rateLimit = (maxRequests: number, windowMinutes: number) => {
  return rateLimitAuth({ maxRequests, windowMinutes });
};
