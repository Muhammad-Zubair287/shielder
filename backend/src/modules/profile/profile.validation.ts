import Joi from 'joi';

export const profileValidation = {
  updateProfile: Joi.object({
    email: Joi.string().trim().email().optional(),
    fullName: Joi.string().trim().max(100).optional(),
    phoneNumber: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{7,20}$|^(\+?966|0)5[0-9]{8}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number (e.g. 05XXXXXXXX or +966 5X XXX XXXX)',
      }),
    address: Joi.string().trim().max(255).optional(),
    profileImage: Joi.string().uri().optional(),
    companyName: Joi.string().trim().max(100).optional(),
    taxId: Joi.string().trim().max(50).optional(),
    preferences: Joi.object().optional(),
  }),

  updateLanguage: Joi.object({
    preferredLanguage: Joi.string().valid('en', 'ar').required(),
  }),
};
