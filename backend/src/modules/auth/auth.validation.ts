/**
 * Enhanced Authentication Validation
 * Joi schemas for all auth endpoints
 */

import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

/**
 * Password validation rules (OWASP compliant)
 */
const passwordSchema = sharedValidationSchemas.password;

/**
 * Email validation
 */
const emailSchema = sharedValidationSchemas.email;

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
      .pattern(/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/)
      .required()
      .messages({
        'any.required': 'Phone number is required',
        'string.pattern.base': 'Please provide a valid phone number (e.g. 05XXXXXXXX or +966 5X XXX XXXX)',
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

  /**
   * Send OTP validation (2FA)
   */
  sendOTP: Joi.object({
    userId: Joi.string().required().messages({
      'string.empty': 'User ID is required',
      'any.required': 'User ID is required',
    }),
    method: Joi.string().valid('EMAIL', 'SMS').default('EMAIL'),
  }),

  /**
   * Verify OTP validation (2FA)
   */
  verifyOTP: Joi.object({
    userId: Joi.string().required().messages({
      'string.empty': 'User ID is required',
      'any.required': 'User ID is required',
    }),
    otpSessionToken: Joi.string().required().messages({
      'string.empty': 'OTP session token is required',
      'any.required': 'OTP session token is required',
    }),
    code: Joi.string()
      .length(6)
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.empty': 'OTP code is required',
        'string.length': 'OTP code must be 6 digits',
        'string.pattern.base': 'OTP code must contain only numbers',
        'any.required': 'OTP code is required',
      }),
  }),
};
