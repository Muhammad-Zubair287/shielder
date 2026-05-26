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
  // Generate short error id for correlation (returned to client)
  const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const response: ErrorResponse = {
    success: false,
    message,
  };

  // Add errors array if validation error
  if (errors) {
    response.errors = errors;
  }

  // Log the full error server-side with the errorId so developers can correlate
  logger.error(`Error ID: ${errorId} - ${message}`, err, {
    statusCode,
    path: req.path,
    method: req.method,
    errorId,
  });

  // By default do NOT expose stack traces to clients. If a developer explicitly
  // needs the stack in responses for local debugging, set the environment
  // variable `EXPOSE_STACK_IN_RESPONSE=true` in a non-production environment.
  // This must be explicit; production never exposes stack traces.
  const exposeStack = env.isDevelopment && process.env.EXPOSE_STACK_IN_RESPONSE === 'true';
  if (exposeStack) {
    // attach stack only when explicitly allowed in development
    response.stack = err.stack;
  }

  // Ensure CORS is allowed even for errors
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
  console.log(`[404 NOT FOUND] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'None'}`);
  
  // Ensure CORS is allowed even for 404s
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

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
