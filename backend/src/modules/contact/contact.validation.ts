import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const contactValidation = {
  submit: Joi.object({
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().min(1).max(100).required(),
    email: sharedValidationSchemas.email,
    phone: Joi.string().trim().allow('').max(30).optional(),
    subject: Joi.string().trim().min(1).max(120).required(),
    message: Joi.string().trim().min(1).max(5000).required(),
    captchaToken: Joi.string().trim().min(6).max(2048).required(),
  }),
};
