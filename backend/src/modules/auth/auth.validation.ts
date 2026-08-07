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
 * Optional signup text: empty (including whitespace-only) input is normalized
 * away, while any provided value still receives the standard security and
 * length validation from textNoHtml.
 */
const optionalSignupText = (maxLength: number) =>
  sharedValidationSchemas.textNoHtml.max(maxLength).empty('').optional();

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
    fullName: sharedValidationSchemas.fullName.max(50).required(),
    phoneNumber: sharedValidationSchemas.phoneRequired,
    address: optionalSignupText(150),
    location: optionalSignupText(150),
    companyName: optionalSignupText(50),
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
    rememberDevice: Joi.boolean().optional(),
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
   * Send forgot-password OTP validation
   */
  forgotPasswordSendOtp: Joi.object({
    email: emailSchema,
  }),

  /**
   * Resend forgot-password OTP validation
   */
  forgotPasswordResendOtp: Joi.object({
    email: emailSchema,
  }),

  /**
   * Verify forgot-password OTP validation
   */
  forgotPasswordVerifyOtp: Joi.object({
    email: emailSchema,
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

  /**
   * Reset password using verified forgot-password OTP session
   */
  forgotPasswordResetWithOtp: Joi.object({
    resetSessionToken: Joi.string().required().messages({
      'string.empty': 'Reset session token is required',
      'any.required': 'Reset session token is required',
    }),
    newPassword: passwordSchema,
  }),

  /**
   * Resend email verification validation
   */
  resendVerificationEmail: Joi.object({
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
    rememberDevice: Joi.boolean().optional(),
  }),

  /**
   * Verify forced email-verification OTP
   */
  verifyEmailOtp: Joi.object({
    verificationSessionToken: Joi.string().required().messages({
      'string.empty': 'Verification session token is required',
      'any.required': 'Verification session token is required',
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

  /**
   * Resend forced email-verification OTP
   */
  resendEmailVerificationOtp: Joi.object({
    verificationSessionToken: Joi.string().required().messages({
      'string.empty': 'Verification session token is required',
      'any.required': 'Verification session token is required',
    }),
  }),

  /**
   * Change email during forced verification
   */
  changeVerificationEmail: Joi.object({
    verificationSessionToken: Joi.string().required().messages({
      'string.empty': 'Verification session token is required',
      'any.required': 'Verification session token is required',
    }),
    newEmail: emailSchema,
  }),

  /**
   * Initiate registration (Step 1 — sends OTP, no user created)
   */
  initiateRegistration: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    fullName: sharedValidationSchemas.fullName.max(50).required(),
    phoneNumber: sharedValidationSchemas.phoneRequired,
    address:           optionalSignupText(150),
    location:          optionalSignupText(150),
    companyName:       optionalSignupText(50),
    preferredLanguage: Joi.string().valid('en', 'ar').default('en'),
  }).unknown(false),

  /**
   * Verify registration OTP (Step 2 — creates user)
   */
  verifyRegistrationOtp: Joi.object({
    registrationSessionToken: Joi.string().required().messages({
      'any.required': 'Session token is required',
    }),
    code: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
      'any.required': 'Verification code is required',
      'string.length': 'Code must be 6 digits',
      'string.pattern.base': 'Code must be numeric',
    }),
  }),

  /**
   * Resend registration OTP
   */
  resendRegistrationOtp: Joi.object({
    registrationSessionToken: Joi.string().required().messages({
      'any.required': 'Session token is required',
    }),
  }),
};
