import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

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
        customerName: sharedValidationSchemas.personName.required().messages({
            'string.empty': 'Customer name is required',
        }),
        customerEmail: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Customer email is required',
        }),
        customerPhone: Joi.string().allow('', null).optional(),
        customerAddress: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        companyName: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).required().messages({
            'array.min': 'At least one product item is required',
        }),
        discount: Joi.number().min(0).default(0),
        taxRate: Joi.number().min(0).default(0),
        notes: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        userMessage: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        adminReply: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        terms: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        quotationDate: Joi.date().iso().optional(),
        expiryDate: Joi.date().iso().required().messages({
            'any.required': 'Expiry date is required',
            'date.format': 'Expiry date must be a valid ISO date',
        }),
    }),

    update: Joi.object({
        customerName: sharedValidationSchemas.textNoHtml.min(2).max(100).optional(),
        customerEmail: Joi.string().email().optional(),
        customerPhone: Joi.string().allow('', null).optional(),
        customerAddress: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        companyName: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        items: Joi.array().items(quotationItemSchema).min(1).optional(),
        discount: Joi.number().min(0).optional(),
        taxRate: Joi.number().min(0).optional(),
        notes: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        userMessage: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        adminReply: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        terms: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
        expiryDate: Joi.date().iso().optional(),
    }).min(1).messages({
        'object.min': 'At least one field is required to update quotation',
    }),

    reactivate: Joi.object({
        expiryDate: Joi.date().iso().required().messages({
            'any.required': 'New expiry date is required',
        }),
    }),

    reject: Joi.object({
        reason: sharedValidationSchemas.textNoHtml.allow('', null).optional(),
    }),
};
