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
    'profileImage.dataUri': 'profile.imageDataUriRejected',
    'profileImage.uriOrPath': 'profile.imageInvalidPath',
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
    fullName: sharedValidationSchemas.fullName.optional(),
    phoneNumber: sharedValidationSchemas.phone,
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
