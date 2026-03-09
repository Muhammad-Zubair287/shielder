import Joi from 'joi';

export const orderValidation = {
  createOrder: Joi.object({
    userId: Joi.string().uuid().required(),
    shippingAddress: Joi.string().required(),
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
    status: Joi.string().valid('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED').optional(),
    paymentStatus: Joi.string().valid('UNPAID', 'PAID', 'PARTIAL', 'REFUNDED', 'FAILED').optional(),
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('', null),
    status: Joi.string().valid('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED').allow('', null),
    paymentStatus: Joi.string().valid('UNPAID', 'PAID', 'PARTIAL', 'REFUNDED', 'FAILED').allow('', null),
    dateFrom: Joi.date().iso().allow('', null),
    dateTo: Joi.date().iso().allow('', null),
    sortBy: Joi.string().valid('createdAt', 'total', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};
