import Joi from 'joi';

export const profileValidation = {
  updateProfile: Joi.object({
    fullName: Joi.string().trim().max(100).optional(),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number in international format',
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
