import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const profileValidation = {
  updateProfile: Joi.object({
    email: Joi.string().trim().email().optional(),
    fullName: sharedValidationSchemas.textNoHtml.max(100).optional(),
    phoneNumber: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number (e.g. 05XXXXXXXX or +966 5X XXX XXXX)',
      }),
    address: sharedValidationSchemas.textNoHtml.max(255).optional(),
      location: sharedValidationSchemas.textNoHtml.max(255).optional(),
    profileImage: Joi.string().uri().allow(null).optional(),
    companyName: sharedValidationSchemas.textNoHtml.max(100).optional(),
    taxId: sharedValidationSchemas.textNoHtml.max(50).optional(),
    preferences: Joi.object().optional(),
  }),

  updateLanguage: Joi.object({
    preferredLanguage: Joi.string().valid('en', 'ar').required(),
  }),
};
