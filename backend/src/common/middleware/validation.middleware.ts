/**
 * Validation Middleware
 * Validates request data against Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/api.error';

/**
 * Validate request data (body, query, or params) against a Joi schema
 */
export const validate = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: source === 'body', // Strip unknown only for body to avoid removing custom spec filters in query
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      next(new ValidationError('Validation failed', errors));
      return;
    }

    // Replace request data with validated value
    req[source] = value;
    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      next(new ValidationError('Validation failed', errors));
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      next(new ValidationError('Validation failed', errors));
      return;
    }

    req.params = value;
    next();
  };
};
