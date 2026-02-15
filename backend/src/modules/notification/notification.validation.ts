/**
 * Notification Validation
 * Joi validation schemas for notification operations
 */

import Joi from 'joi';

export const notificationValidation = {
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
