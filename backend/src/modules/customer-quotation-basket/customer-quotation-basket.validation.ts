/**
 * Customer Quotation Basket Validation
 */

import Joi from 'joi';

export function validateAddUpdateItem(data: any) {
  const schema = Joi.object({
    productId: Joi.string().uuid().required().messages({
      'string.empty': 'Product ID is required',
      'string.guid': 'Product ID must be a valid UUID',
    }),
    quantity: Joi.number().integer().min(1).max(10_000).required().messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 10,000',
    }),
  });

  return schema.validate(data, { abortEarly: false });
}

export function validateUpdateQuantity(data: any) {
  const schema = Joi.object({
    quantity: Joi.number().integer().min(1).max(10_000).required().messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 10,000',
    }),
  });

  return schema.validate(data, { abortEarly: false });
}
