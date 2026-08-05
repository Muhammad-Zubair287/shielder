import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const orderValidation = {
  createOrder: Joi.object({
    deliveryType: Joi.string().valid('DELIVERY', 'PICKUP').default('DELIVERY'),
    warehouseId: Joi.when('deliveryType', {
      is: 'PICKUP',
      then: Joi.string().uuid().required(),
      otherwise: Joi.string().uuid().optional().allow(null),
    }),
    shippingAddress: Joi.when('deliveryType', {
      is: 'DELIVERY',
      then: sharedValidationSchemas.textNoHtml.max(200).required().messages({
        'any.required': 'Shipping address is required for delivery orders',
      }),
      otherwise: sharedValidationSchemas.textNoHtml.max(200).allow('', null).optional(),
    }),
    phoneNumber: sharedValidationSchemas.phoneRequired,
    customerName: sharedValidationSchemas.textNoHtml.min(2).max(100).required().messages({
      'any.required': 'Customer name is required',
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 100 characters',
    }),
    paymentMethod: Joi.string().valid('CASH', 'BANK_TRANSFER', 'CREDIT_CARD').required().messages({
      'any.required': 'Payment method is required',
      'any.only': 'Payment method must be CASH, BANK_TRANSFER, or CREDIT_CARD',
    }),
    notes: sharedValidationSchemas.textNoHtml.max(500).allow('', null).optional(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        variantId: Joi.string().uuid().optional(),
        quantity: Joi.number().integer().min(1).max(10_000).required().messages({
          'number.min': 'Quantity must be at least 1',
          'number.max': 'Quantity cannot exceed 10,000',
        }),
      })
    ).min(1).required().messages({
      'array.min': 'At least one item is required',
      'any.required': 'Items are required',
    }),
    // Backend recalculates these from actual product prices — accept but don't require
    subtotal: Joi.number().optional(),
    tax: Joi.number().optional(),
    total: Joi.number().optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string()
      .valid(
        'PENDING',
        'READY_FOR_PICKUP',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
      )
      .optional(),
    paymentStatus: Joi.string()
      .valid('UNPAID', 'PAID', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED')
      .optional(),
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('', null),
    status: Joi.string()
      .valid('PENDING', 'READY_FOR_PICKUP', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED')
      .allow('', null),
    paymentStatus: Joi.string()
      .valid('UNPAID', 'PAID', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED')
      .allow('', null),
    dateFrom: Joi.date().iso().allow('', null),
    dateTo: Joi.date().iso().allow('', null).when('dateFrom', {
      is: Joi.date().exist(),
      then: Joi.date().min(Joi.ref('dateFrom')).messages({
        'date.min': 'End date must be on or after start date',
      }),
    }),
    sortBy: Joi.string().valid('createdAt', 'total', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};
