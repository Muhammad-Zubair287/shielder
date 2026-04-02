import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const newsletterValidation = {
  subscribe: Joi.object({
    email: sharedValidationSchemas.email,
  }),

  list: sharedValidationSchemas.pagination.keys({
    active: Joi.boolean().optional(),
  }),
};
