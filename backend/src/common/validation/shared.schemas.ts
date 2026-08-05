import Joi from 'joi';
import { isCommonWeakPassword } from '../utils/password.utils';

const passwordMessages = {
  minLength: 'Password must be at least 8 characters',
  maxLength: 'Password must not exceed 128 characters',
  uppercase: 'Password must contain at least one uppercase letter',
  lowercase: 'Password must contain at least one lowercase letter',
  number: 'Password must contain at least one number',
  special: 'Password must contain at least one special character',
  common: 'Password does not meet security requirements',
};

export const sharedValidationSchemas = {
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .max(254)
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),

  password: Joi.string()
    .custom((value, helpers) => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return helpers.error('string.empty');
      }

      return value;
    }, 'Password required check')
    .custom((value, helpers) => {
      if (value.length < 8) {
        return helpers.error('password.minLength');
      }

      return value;
    }, 'Password minimum length check')
    .custom((value, helpers) => {
      if (value.length > 32) {
        return helpers.error('password.maxLength');
      }

      return value;
    }, 'Password maximum length check')
    .custom((value, helpers) => {
      if (/<[^>]*>|javascript\s*:|on\w+\s*=|(?:'|\")\s*(?:or|and)\s*(?:'|\")?\s*(?:\d+|true)|\b(?:union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b|--|\/\*|\*\/|;/i.test(value)) {
        return helpers.error('string.invalid');
      }
      return value;
    }, 'Password injection check')
    .custom((value, helpers) => {
      if (isCommonWeakPassword(value)) {
        return helpers.error('password.common');
      }

      return value;
    }, 'Password common weak password check')
    .custom((value, helpers) => {
      if (!/[A-Z]/.test(value)) {
        return helpers.error('password.uppercase');
      }

      return value;
    }, 'Password uppercase check')
    .custom((value, helpers) => {
      if (!/[a-z]/.test(value)) {
        return helpers.error('password.lowercase');
      }

      return value;
    }, 'Password lowercase check')
    .custom((value, helpers) => {
      if (!/\d/.test(value)) {
        return helpers.error('password.number');
      }

      return value;
    }, 'Password number check')
    .custom((value, helpers) => {
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return helpers.error('password.special');
      }

      return value;
    }, 'Password special character check')
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.invalid': 'Password contains unsafe content',
      'password.minLength': passwordMessages.minLength,
      'password.maxLength': passwordMessages.maxLength,
      'password.uppercase': passwordMessages.uppercase,
      'password.lowercase': passwordMessages.lowercase,
      'password.number': passwordMessages.number,
      'password.special': passwordMessages.special,
      'password.common': passwordMessages.common,
      'any.required': 'Password is required',
    }),

  uuid: Joi.string().uuid().required(),

  // Generic text field without HTML/JS content
  textNoHtml: Joi.string()
    .trim()
    .max(1024)
    .custom((value, helpers) => {
      if (/[\u0000-\u001F\u007F]/.test(value)) return helpers.error('string.invalid');
      if (/<[^>]+>/.test(value)) return helpers.error('string.invalid');
      if (/javascript:\s*/i.test(value)) return helpers.error('string.invalid');
      if (/on\w+\s*=/.test(value)) return helpers.error('string.invalid');
      if (/(?:'|\")\s*(?:or|and)\s*(?:'|\")?\s*(?:\d+|true)/i.test(value)) return helpers.error('string.invalid');
      if (/\b(?:union\s+select|drop\s+table|delete\s+from|insert\s+into|update\s+\w+\s+set)\b/i.test(value)) return helpers.error('string.invalid');
      return value;
    }, 'No HTML/JS')
    .messages({
      'string.invalid': 'Input contains disallowed HTML or script content',
    }),

  // Strict name field for customer/person names
  personName: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[\p{L}]+(?:[ .'’-][\p{L}]+)*$/u)
    .messages({
      'string.empty': 'Name is required',
      'string.pattern.base': 'Invalid name format',
      'string.max': 'Name must not exceed 100 characters',
    }),

  /**
   * Full name field for user profiles.
   * Accepts Unicode letters, spaces, hyphens, and apostrophes.
   * Rejects numeric-only input, HTML/JS injection, and special characters.
   */
  fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .custom((value, helpers) => {
      if (/<[^>]+>/.test(value) || /javascript:\s*/i.test(value) || /on\w+\s*=/.test(value)) {
        return helpers.error('fullName.lettersOnly');
      }
      // Must contain at least one Unicode letter; only letters, spaces, hyphens, apostrophes allowed
      if (!/^(?=.*[\p{L}])[\p{L}\s'’\-]+$/u.test(value)) {
        return helpers.error('fullName.lettersOnly');
      }
      return value;
    }, 'Full name validation')
    .messages({
      'string.empty':        'Full name is required.',
      'string.min':          'Full name must be at least {{#limit}} characters.',
      'string.max':          'Full name must not exceed {{#limit}} characters.',
      'fullName.lettersOnly': 'Full name should contain only letters and spaces.',
    }),

  /**
   * Name field for inventory entities (Category, Subcategory, Product).
   * Requires at least one Unicode letter — rejects numeric-only values.
   * Allows letters, digits, spaces, and common punctuation.
   * Blocks HTML/JS injection.
   */
  inventoryName: Joi.string()
    .trim()
    .max(100)
    .custom((value, helpers) => {
      if (!value) return value;
      if (/<[^>]+>/.test(value) || /javascript:\s*/i.test(value) || /on\w+\s*=/.test(value)) {
        return helpers.error('inventoryName.invalid');
      }
      if (!/[\p{L}]/u.test(value)) {
        return helpers.error('inventoryName.invalid');
      }
      return value;
    }, 'Inventory name validation')
    .messages({
      'string.empty': 'Name is required.',
      'inventoryName.invalid': 'Name must contain valid alphabetic characters and cannot be numbers only.',
    }),

  superAdminName: Joi.string()
    .trim()
    .max(25)
    .pattern(/^(?=.*[A-Za-z])[A-Za-z\s]+$/)
    .messages({
      'string.empty': 'Name is required',
      'string.max': 'Name must contain letters only and cannot exceed 25 characters',
      'string.pattern.base': 'Name must contain letters only and cannot exceed 25 characters',
    }),

  /**
   * Unified phone number schema.
   * Accepts: optional leading +, digits (0-9), and spaces for formatting.
   * Rejects: letters, hyphens, parentheses, multiple + signs, all XSS/SQL payloads.
   * Length: 7–20 characters.
   */
  phone: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const trimmed = value.trim();
      if (!trimmed) return helpers.error('string.empty');
      if (!/^\+?[0-9 ]+$/.test(trimmed)) return helpers.error('phone.invalid');
      if (!/[0-9]/.test(trimmed)) return helpers.error('phone.invalid');
      const len = trimmed.length;
      if (len < 7 || len > 20) return helpers.error('phone.invalid');
      if (/  /.test(trimmed)) return helpers.error('phone.invalid');
      return trimmed;
    }, 'Phone number validation')
    .messages({
      'string.empty': 'Phone number is required.',
      'any.required': 'Phone number is required.',
      'phone.invalid': 'Please provide a valid phone number.',
    })
    .optional()
    .allow('', null),

  phoneRequired: Joi.string()
    .trim()
    .custom((value, helpers) => {
      const trimmed = value.trim();
      if (!trimmed) return helpers.error('string.empty');
      if (!/^\+?[0-9 ]+$/.test(trimmed)) return helpers.error('phone.invalid');
      if (!/[0-9]/.test(trimmed)) return helpers.error('phone.invalid');
      const len = trimmed.length;
      if (len < 7 || len > 20) return helpers.error('phone.invalid');
      if (/  /.test(trimmed)) return helpers.error('phone.invalid');
      return trimmed;
    }, 'Phone number validation')
    .messages({
      'string.empty': 'Phone number is required.',
      'any.required': 'Phone number is required.',
      'phone.invalid': 'Please provide a valid phone number.',
    })
    .required(),

  superAdminPhone: Joi.string()
    .trim()
    .max(15)
    .pattern(/^[0-9]+$/)
    .messages({
      'string.empty': 'Phone number is required',
      'string.max': 'Phone number must contain digits only and cannot exceed 15 characters',
      'string.pattern.base': 'Phone number must contain digits only and cannot exceed 15 characters',
    }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
