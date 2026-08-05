/**
 * Error Handling Middleware
 * Centralized error handling for Express with locale-aware messages.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationError, TooManyRequestsError } from '../errors/api.error';
import { logger } from '../logger/logger';
import { env } from '../../config/env';
import { t } from '../i18n';

interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  stack?: string;
  [key: string]: unknown;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const locale = req.locale ?? 'en';

  let statusCode = 500;
  let message = t('common.internalError', locale);
  let errors: any[] | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message; // already localised by the controller/service that threw it

    if (err instanceof ValidationError) {
      errors = err.errors;
    }

    if (err.isOperational) {
      logger.warn(`Operational error: ${message}`, {
        statusCode,
        path: req.path,
        method: req.method,
      });
    } else {
      logger.error('Non-operational error', err, {
        path: req.path,
        method: req.method,
      });
    }
  } else {
    // Unexpected / non-operational error — use locale-aware fallback
    message = t('common.internalError', locale);
    logger.error('Unexpected error', err, {
      path: req.path,
      method: req.method,
    });
  }

  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const response: ErrorResponse = { success: false, message };
  if (errors) response.errors = errors;
  if (err instanceof TooManyRequestsError && err.data) {
    Object.assign(response, err.data);
  }

  logger.error(`Error ID: ${errorId} - ${message}`, err, {
    statusCode,
    path: req.path,
    method: req.method,
    errorId,
  });

  const exposeStack = env.isDevelopment && process.env.EXPOSE_STACK_IN_RESPONSE === 'true';
  if (exposeStack) response.stack = err.stack;

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const locale = req.locale ?? 'en';
  logger.warn(`[404] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'None'}`);

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(404).json({
    success: false,
    message: t('common.routeNotFound', locale),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
