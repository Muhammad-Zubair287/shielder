/**
 * Admin Validation
 * Joi validation schemas for admin operations
 */

import Joi from 'joi';
import { UserStatus } from '../../common/constants/roles';

export const adminValidation = {
  /**
   * Create user validation
   */
  createUser: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),
    companyName: Joi.string().optional(),
  }),

  /**
   * Update user validation
   */
  updateUser: Joi.object({
    email: Joi.string().email().optional(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),
    companyName: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(UserStatus))
      .optional(),
  }),

  /**
   * Update user status validation
   */
  updateStatus: Joi.object({
    isActive: Joi.boolean().required().messages({
      'any.required': 'isActive field is required',
    }),
  }),

  /**
   * Reset password validation
   */
  resetPassword: Joi.object({
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'any.required': 'Password is required',
    }),
  }),

  /**
   * Query params validation for user list
   */
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(UserStatus))
      .optional(),
    isActive: Joi.boolean().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
  }),
};
