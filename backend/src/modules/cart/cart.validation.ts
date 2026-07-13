import Joi from 'joi';

const MAX_ITEM_QUANTITY = 10_000;

export const cartValidation = {
  addItem: Joi.object({
    productId: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid product ID',
      'any.required': 'Product ID is required',
    }),
    quantity: Joi.number().integer().min(1).max(MAX_ITEM_QUANTITY).default(1).messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': `Quantity cannot exceed ${MAX_ITEM_QUANTITY}`,
    }),
  }),

  updateItem: Joi.object({
    quantity: Joi.number().integer().min(1).max(MAX_ITEM_QUANTITY).required().messages({
      'number.min': 'Quantity must be at least 1',
      'number.max': `Quantity cannot exceed ${MAX_ITEM_QUANTITY}`,
      'any.required': 'Quantity is required',
    }),
  }),
};
