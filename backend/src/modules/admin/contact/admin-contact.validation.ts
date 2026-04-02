import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const adminContactValidation = {
  list: sharedValidationSchemas.pagination.keys({
    status: Joi.string().valid('PENDING', 'RESOLVED').optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
  }),

  resolve: Joi.object({
    id: sharedValidationSchemas.uuid,
  }),
};
