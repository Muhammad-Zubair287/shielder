/**
 * Inventory Alert Validation
 * Schema definitions for alert creation and management
 */

import Joi from 'joi';

export const inventoryAlertValidation = {
  createAlert: Joi.object({
    productId: Joi.string().uuid().required(),
    threshold: Joi.number().integer().min(1).max(10000).required(),
  }),

  updateAlert: Joi.object({
    threshold: Joi.number().integer().min(1).max(10000),
    status: Joi.string().valid('ACTIVE', 'INACTIVE'),
  }),

  listAlerts: Joi.object({
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'TRIGGERED'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
