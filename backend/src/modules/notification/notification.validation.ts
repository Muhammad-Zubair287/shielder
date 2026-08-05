/**
 * Notification Validation
 * Joi validation schemas for notification operations
 */

import Joi from 'joi';

export const notificationValidation = {
  /**
   * Create manual notification (admin broadcast)
   */
  create: Joi.object({
    title: Joi.string().trim().min(1).max(255).required().messages({
      'string.empty': 'Notification title is required.',
      'any.required': 'Notification title is required.',
      'string.max': 'Title must not exceed 255 characters.',
    }),
    message: Joi.string().trim().min(1).max(2000).required().messages({
      'string.empty': 'Notification message is required.',
      'any.required': 'Notification message is required.',
      'string.max': 'Message must not exceed 2000 characters.',
    }),
    targetRole: Joi.string().valid('CUSTOMER', 'ADMIN', 'USER', 'SUPER_ADMIN', 'STAFF', 'SUPPLIER').optional().allow(null),
    userId: Joi.string().uuid().optional(),
  }),

  /**
   * Query params for list
   */
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
  }),

  /**
   * ID parameter validation
   */
  idParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};
