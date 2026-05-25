import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const contactValidation = {
  submit: Joi.object({
    firstName: sharedValidationSchemas.textNoHtml
      .min(1)
      .max(100)
      .when('fullName', {
        is: sharedValidationSchemas.textNoHtml.min(1),
        then: Joi.optional().allow(''),
        otherwise: Joi.required(),
      }),
    lastName: sharedValidationSchemas.textNoHtml
      .min(1)
      .max(100)
      .when('fullName', {
        is: sharedValidationSchemas.textNoHtml.min(1),
        then: Joi.optional().allow(''),
        otherwise: Joi.required(),
      }),
    fullName: sharedValidationSchemas.textNoHtml.min(1).max(201).optional().allow(''),
    email: sharedValidationSchemas.email,
    phone: Joi.string().trim().allow('').max(30).optional(),
    subject: sharedValidationSchemas.textNoHtml.min(1).max(120).required(),
    message: sharedValidationSchemas.textNoHtml.min(1).max(5000).required(),
    captchaToken: Joi.string().trim().min(6).max(2048).optional().allow(''),
  }),
};
