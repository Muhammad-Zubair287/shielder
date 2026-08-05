import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

const quotationItemSchema = Joi.object({
    productId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'string.guid': 'Invalid product ID',
        'any.required': 'Product ID is required',
    }),
    quantity: Joi.number().integer().min(1).max(10_000).required().messages({
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Quantity cannot exceed 10,000',
        'any.required': 'Quantity is required',
    }),
    discount: Joi.number().min(0).max(100).default(0).messages({
        'number.max': 'Item discount cannot exceed 100%',
    }),
});

export const quotationValidation = {
    create: Joi.object({
        customerName: sharedValidationSchemas.personName.required().messages({
            'string.empty': 'Customer name is required',
        }),
        customerEmail: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Customer email is required',
        }),
        customerPhone: sharedValidationSchemas.phone,
        customerAddress: sharedValidationSchemas.textNoHtml.max(200).allow('', null).optional(),
        companyName: sharedValidationSchemas.textNoHtml.max(100).allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).required().messages({
            'array.min': 'At least one product item is required',
        }),
        discount: Joi.number().min(0).max(100).default(0).messages({
            'number.max': 'Discount cannot exceed 100%',
        }),
        taxRate: Joi.number().min(0).max(100).default(0).messages({
            'number.max': 'Tax rate cannot exceed 100%',
        }),
        notes: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        userMessage: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        adminReply: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        terms: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        quotationDate: Joi.date().iso().optional(),
        expiryDate: Joi.date().iso().min('now').required().messages({
            'any.required': 'Expiry date is required',
            'date.format': 'Expiry date must be a valid ISO date',
            'date.min': 'Expiry date must be in the future',
        }),
    }),

    update: Joi.object({
        customerName: sharedValidationSchemas.textNoHtml.min(2).max(100).optional(),
        customerEmail: Joi.string().email().optional(),
        customerPhone: sharedValidationSchemas.phone,
        customerAddress: sharedValidationSchemas.textNoHtml.max(200).allow('', null).optional(),
        companyName: sharedValidationSchemas.textNoHtml.max(100).allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).optional(),
        discount: Joi.number().min(0).max(100).optional().messages({
            'number.max': 'Discount cannot exceed 100%',
        }),
        taxRate: Joi.number().min(0).max(100).optional().messages({
            'number.max': 'Tax rate cannot exceed 100%',
        }),
        notes: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        userMessage: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        adminReply: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        terms: sharedValidationSchemas.textNoHtml.max(2000).allow('', null).optional(),
        expiryDate: Joi.date().iso().min('now').optional().messages({
            'date.min': 'Expiry date must be in the future',
        }),
    }).min(1).messages({
        'object.min': 'At least one field is required to update quotation',
    }),

    reactivate: Joi.object({
        expiryDate: Joi.date().iso().min('now').required().messages({
            'any.required': 'New expiry date is required',
            'date.min': 'New expiry date must be in the future',
        }),
    }),

    reject: Joi.object({
        reason: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
    }),
};
