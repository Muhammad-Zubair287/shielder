import Joi from 'joi';

const quotationItemSchema = Joi.object({
    productId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Invalid product ID',
        'any.required': 'Product ID is required',
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required',
    }),
    discount: Joi.number().min(0).default(0),
});

export const quotationValidation = {
    create: Joi.object({
        customerName: Joi.string().trim().min(2).max(100).required().messages({
            'string.empty': 'Customer name is required',
        }),
        customerEmail: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Customer email is required',
        }),
        customerPhone: Joi.string().allow('', null).optional(),
        customerAddress: Joi.string().allow('', null).optional(),
        companyName: Joi.string().allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).required().messages({
            'array.min': 'At least one product item is required',
        }),
        discount: Joi.number().min(0).default(0),
        taxRate: Joi.number().min(0).default(0),
        notes: Joi.string().allow('', null).optional(),
        userMessage: Joi.string().allow('', null).optional(),
        adminReply: Joi.string().allow('', null).optional(),
        terms: Joi.string().allow('', null).optional(),
        quotationDate: Joi.date().iso().optional(),
        expiryDate: Joi.date().iso().required().messages({
            'any.required': 'Expiry date is required',
            'date.format': 'Expiry date must be a valid ISO date',
        }),
    }),

    update: Joi.object({
        customerName: Joi.string().trim().min(2).max(100).optional(),
        customerEmail: Joi.string().email().optional(),
        customerPhone: Joi.string().allow('', null).optional(),
        customerAddress: Joi.string().allow('', null).optional(),
        companyName: Joi.string().allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).optional(),
        discount: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).optional(),
        notes: Joi.string().allow('', null).optional(),
        userMessage: Joi.string().allow('', null).optional(),
        adminReply: Joi.string().allow('', null).optional(),
        terms: Joi.string().allow('', null).optional(),
        expiryDate: Joi.date().iso().optional(),
    }),

    reactivate: Joi.object({
        expiryDate: Joi.date().iso().required().messages({
            'any.required': 'New expiry date is required',
        }),
    }),

    reject: Joi.object({
        reason: Joi.string().allow('', null).optional(),
    }),
};
