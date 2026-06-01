/**
 * JSON Parse Error Handler Middleware
 * Catches SyntaxError from express.json() and express.urlencoded() parsing
 * and converts them to proper 400 Bad Request responses
 */

import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../errors/api.error';

/**
 * Middleware to catch JSON parsing errors
 * Express.json() and express.urlencoded() throw errors when body is malformed.
 * This middleware catches those errors and converts them to proper API errors.
 */
export const jsonParseErrorHandler = (
  err: any,
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  void _res;
  // Check if this is a body parsing error
  // SyntaxError from JSON.parse() has message like "Unexpected token..." or "Unexpected end of JSON input"
  if (err instanceof SyntaxError && 'body' in err) {
    // This is a JSON or URL-encoded body parsing error
    const badRequestError = new BadRequestError(
      `Invalid ${req.is('application/json') ? 'JSON' : 'URL-encoded'} format: ${err.message}`
    );

    // Pass to the global error handler
    return next(badRequestError);
  }

  // If not a body parsing error, pass to the next error handler
  next(err);
};
