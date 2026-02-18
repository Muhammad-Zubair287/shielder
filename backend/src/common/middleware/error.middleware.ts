/**
 * Error Handling Middleware
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationError } from '../errors/api.error';
import { logger } from '../logger/logger';
import { env } from '../../config/env';

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
  stack?: string;
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any[] | undefined;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;

    // Add validation errors if present
    if (err instanceof ValidationError) {
      errors = err.errors;
    }

    // Log operational errors as warnings
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
    // Log unexpected errors
    logger.error('Unexpected error', err, {
      path: req.path,
      method: req.method,
    });
  }

  // Prepare error response
  const response: ErrorResponse = {
    success: false,
    message,
  };

  // Add errors array if validation error
  if (errors) {
    response.errors = errors;
  }

  // Include stack trace in development
  if (env.isDevelopment) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  console.log(`[404 NOT FOUND] ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
