import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

// Name validator for contact form: Unicode letters, spaces, apostrophes, hyphens.
// Rejects numbers, HTML, JS injection, and SQL patterns.
const contactPersonName = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .custom((value, helpers) => {
    const v = value.trim();
    if (!v) return helpers.error('string.empty');
    // Allow only Unicode letters, spaces, apostrophes ('' and '), and hyphens
    if (!/^[\p{L}\s''\-]+$/u.test(v) || !/[\p{L}]/u.test(v)) {
      return helpers.error('contact.nameInvalid');
    }
    return value;
  }, 'Contact person name validation')
  .messages({
    'string.empty':       'Name is required.',
    'string.max':         'Name must not exceed 100 characters.',
    'contact.nameInvalid': 'Name may only contain letters, spaces, hyphens, and apostrophes.',
  });

export const contactValidation = {
  submit: Joi.object({
    firstName: contactPersonName.when('fullName', {
      is: sharedValidationSchemas.textNoHtml.min(1),
      then: Joi.optional().allow(''),
      otherwise: Joi.required(),
    }),
    lastName: contactPersonName.when('fullName', {
      is: sharedValidationSchemas.textNoHtml.min(1),
      then: Joi.optional().allow(''),
      otherwise: Joi.required(),
    }),
    fullName:     sharedValidationSchemas.textNoHtml.min(1).max(201).optional().allow(''),
    email:        sharedValidationSchemas.email,
    phone:        sharedValidationSchemas.phone,
    subject:      sharedValidationSchemas.textNoHtml.min(1).max(120).required(),
    message:      sharedValidationSchemas.textNoHtml.min(1).max(5000).required(),
    captchaToken: Joi.string().trim().min(6).max(2048).optional().allow(''),
  }),
};
