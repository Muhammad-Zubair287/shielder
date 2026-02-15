/**
 * Stock Alert Validation
 * Joi schemas for stock-related endpoints
 */

import Joi from 'joi';

export const stockAlertValidation = {
  /**
   * Update stock validation
   */
  updateStock: Joi.object({
    stock: Joi.number().integer().min(0).required().messages({
      'number.base': 'Stock must be a number',
      'number.min': 'Stock cannot be negative',
      'any.required': 'Stock is required',
    }),
  }),

  /**
   * Update threshold validation
   */
  updateThreshold: Joi.object({
    threshold: Joi.number().integer().min(0).required().messages({
      'number.base': 'Threshold must be a number',
      'number.min': 'Threshold cannot be negative',
      'any.required': 'Threshold is required',
    }),
  }),
};
