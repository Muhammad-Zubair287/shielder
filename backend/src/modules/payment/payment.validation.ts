import Joi from 'joi';
import { PaymentMethod } from '@prisma/client';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

/**
 * Custom Joi validation for amount field
 * 
 * Ensures:
 * - Must be a number (rejects strings, booleans, objects, etc.)
 * - Must not be NaN, Infinity, or negative
 * - Must be greater than zero
 * - Provides clear validation error messages
 */
const amountSchema = Joi.number()
  .required()
  .positive()
  .messages({
    'number.base': 'Amount must be a valid number',
    'number.type': 'Amount must be a number, not a string or other type',
    'number.positive': 'Amount must be a positive number greater than zero',
    'any.required': 'Amount is required and cannot be empty',
    'any.only': 'Amount must be a valid number',
    'any.invalid': 'Amount contains an invalid value (NaN is not allowed)'
  });

export const recordPaymentSchema = Joi.object({
  orderId: Joi.string()
    .uuid()
    .required()
    .trim()
    .messages({
      'string.uuid': 'Order ID must be a valid UUID',
      'string.empty': 'Order ID cannot be empty',
      'any.required': 'Order ID is required'
    }),
  
  amount: amountSchema,
  
  method: Joi.string()
    .required()
    .valid(...Object.values(PaymentMethod))
    .messages({
      'any.only': `Invalid payment method. Must be one of: ${Object.values(PaymentMethod).join(', ')}`,
      'string.empty': 'Payment method cannot be empty',
      'any.required': 'Payment method is required'
    }),
  
  transactionId: Joi.string()
    .optional()
    .allow(null, '')
    .trim()
    .messages({
      'string.base': 'Transaction ID must be a string'
    }),
  
  notes: sharedValidationSchemas.textNoHtml
    .optional()
    .allow(null, '')
    .trim()
    .max(1000)
    .messages({
      'string.base': 'Notes must be a string',
      'string.max': 'Notes cannot exceed 1000 characters'
    })
}).unknown(false) // Reject unknown fields
.messages({
  'object.unknown': 'Unknown field in request body'
});

export const refundPaymentSchema = Joi.object({
  notes: sharedValidationSchemas.textNoHtml.optional().allow(''),
});

export const getPaymentsFilterSchema = Joi.object({
  page: Joi.string().optional(),
  limit: Joi.string().optional(),
  search: Joi.string().optional(),
  status: Joi.string().optional(),
  method: Joi.string().optional(),
  dateFrom: Joi.string().optional(),
  dateTo: Joi.string().optional(),
});
