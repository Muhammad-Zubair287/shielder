import Joi from 'joi';

export const orderValidation = {
  createOrder: Joi.object({
    userId: Joi.string().uuid().required(),
    deliveryType: Joi.string().valid('DELIVERY', 'PICKUP').default('DELIVERY'),
    warehouseId: Joi.when('deliveryType', {
      is: 'PICKUP',
      then: Joi.string().uuid().required(),
      otherwise: Joi.string().uuid().optional().allow(null),
    }),
    shippingAddress: Joi.when('deliveryType', {
      is: 'DELIVERY',
      then: Joi.string().required(),
      otherwise: Joi.string().allow('', null).optional(),
    }),
    phoneNumber: Joi.string().required(),
    customerName: Joi.string().required(),
    paymentMethod: Joi.string().required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().uuid().required(),
        variantId: Joi.string().uuid().optional(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
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
    dateTo: Joi.date().iso().allow('', null),
    sortBy: Joi.string().valid('createdAt', 'total', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};
