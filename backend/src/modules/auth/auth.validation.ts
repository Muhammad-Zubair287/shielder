/**
 * Enhanced Authentication Validation
 * Joi schemas for all auth endpoints
 */

import Joi from 'joi';

/**
 * Password validation rules (OWASP compliant)
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/)
  .required()
  .messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

/**
 * Email validation
 */
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

/**
 * Auth Validation Schemas
 */
export const authValidation = {
  /**
   * Register validation
   */
  register: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    fullName: Joi.string().trim().max(100).required().messages({
      'any.required': 'Full name is required',
    }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        'any.required': 'Phone number is required',
        'string.pattern.base': 'Please provide a valid phone number in international format',
      }),
    address: Joi.string().trim().max(255).required().messages({
      'any.required': 'Address is required',
    }),
    companyName: Joi.string().trim().max(100).optional(),
    role: Joi.string().valid('ADMIN', 'USER').default('USER'),
    preferredLanguage: Joi.string().valid('en', 'ar').default('en'),
  }).unknown(false), // STRICT: Blocks old fields like firstName, lastName, locale

  /**
   * Login validation
   */
  login: Joi.object({
    email: emailSchema,
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  }),

  /**
   * Refresh token validation
   */
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),

  /**
   * Logout validation
   */
  logout: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),

  /**
   * Forgot password validation
   */
  forgotPassword: Joi.object({
    email: emailSchema,
  }),

  /**
   * Reset password validation
   */
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
    newPassword: passwordSchema,
  }),

  /**
   * Change password validation
   */
  changePassword: Joi.object({
    oldPassword: Joi.string().required().messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),
    newPassword: passwordSchema,
  }),
};
