/**
 * Validation Middleware
 * Validates request data against Joi schemas and returns
 * locale-aware field-level error messages.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/api.error';
import { t, translateJoiError } from '../i18n';

interface ValidationOptions {
  requiredFieldsMessage?: string;
}

const REQUIRED_FIELD_ERROR_TYPES = new Set(['any.required', 'object.min', 'string.empty']);

export const resolveValidationMessage = (
  error: Joi.ValidationError,
  locale: string = 'en',
  options?: ValidationOptions,
): string => {
  if (error.details.every((d) => REQUIRED_FIELD_ERROR_TYPES.has(d.type))) {
    return options?.requiredFieldsMessage ?? t('validation.failed', locale);
  }
  const first = error.details[0];
  return first ? translateJoiError(first, locale) : t('validation.failed', locale);
};

/**
 * Validate request body (or query / params) against a Joi schema.
 * Field-level error messages are returned in the request locale.
 */
export const validate = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body',
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const locale = req.locale ?? 'en';
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: source === 'body',
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: translateJoiError(detail, locale),
      }));
      next(new ValidationError(resolveValidationMessage(error, locale), errors));
      return;
    }

    req[source] = value;
    next();
  };
};

/**
 * Validate with route-specific overrides.
 */
export const validateWithOptions = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body',
  options?: ValidationOptions,
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const locale = req.locale ?? 'en';
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: source === 'body',
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: translateJoiError(detail, locale),
      }));
      next(new ValidationError(resolveValidationMessage(error, locale, options), errors));
      return;
    }

    req[source] = value;
    next();
  };
};

/**
 * Validate query parameters.
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const locale = req.locale ?? 'en';
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: translateJoiError(detail, locale),
      }));
      next(new ValidationError(t('validation.failed', locale), errors));
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * Validate route parameters.
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const locale = req.locale ?? 'en';
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: translateJoiError(detail, locale),
      }));
      next(new ValidationError(t('validation.failed', locale), errors));
      return;
    }

    req.params = value;
    next();
  };
};
