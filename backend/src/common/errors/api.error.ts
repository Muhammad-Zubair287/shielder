/**
 * API Error Classes
 * Custom error classes for consistent error handling
 */

/**
 * Base API Error
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

/**
 * Too Many Requests Error (429)
 */
export class TooManyRequestsError extends ApiError {
  public data?: Record<string, unknown>;
  constructor(message: string = 'Too many requests', data?: Record<string, unknown>) {
    super(message, 429);
    this.data = data;
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends ApiError {
  public errors: any[];

  constructor(message: string = 'Validation failed', errors: any[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}
