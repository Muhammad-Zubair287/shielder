import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

const profileImageSchema = Joi.string()
  .trim()
  .max(2048)
  .custom((value, helpers) => {
    if (/^data:/i.test(value)) {
      return helpers.error('profileImage.dataUri');
    }

    if (/^https?:\/\//i.test(value) || /^\/?uploads\/profile\/[^/]+$/i.test(value)) {
      return value;
    }

    return helpers.error('profileImage.uriOrPath');
  })
  .messages({
    'profileImage.dataUri': 'Profile image must be a URL/path, not base64 image data.',
    'profileImage.uriOrPath': 'Profile image must be a valid URL or uploads/profile path.',
  });

export const PROFILE_UPDATE_FIELDS = [
  'email',
  'fullName',
  'phoneNumber',
  'address',
  'location',
  'profileImage',
  'companyName',
  'taxId',
  'preferences',
] as const;

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
    profileImage: profileImageSchema.allow(null).optional(),
    companyName: sharedValidationSchemas.textNoHtml.max(100).optional(),
    taxId: sharedValidationSchemas.textNoHtml.max(50).optional(),
    preferences: Joi.object().optional(),
  })
    .min(1)
    .unknown(false),

  updateLanguage: Joi.object({
    preferredLanguage: Joi.string().valid('en', 'ar').required(),
  }),
};
