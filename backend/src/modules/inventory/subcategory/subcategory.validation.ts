import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const subcategoryValidation = {
  create: Joi.object({
    categoryId: Joi.string().uuid().required(),
    // Bilingual mode (sent by the admin frontend)
    nameEn: sharedValidationSchemas.textNoHtml.max(100),
    descriptionEn: sharedValidationSchemas.textNoHtml.allow('').max(1000),
    nameAr: sharedValidationSchemas.textNoHtml.allow('').max(100),
    descriptionAr: sharedValidationSchemas.textNoHtml.allow('').max(1000),
    // Legacy single-locale fallback
    name: sharedValidationSchemas.textNoHtml.max(100),
    description: sharedValidationSchemas.textNoHtml.allow('').max(1000),
    isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  }).or('nameEn', 'name'), // at least one of nameEn or name must be present
  update: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    nameEn: sharedValidationSchemas.textNoHtml.max(100).optional(),
    descriptionEn: sharedValidationSchemas.textNoHtml.allow('').max(1000).optional(),
    nameAr: sharedValidationSchemas.textNoHtml.allow('').max(100).optional(),
    descriptionAr: sharedValidationSchemas.textNoHtml.allow('').max(1000).optional(),
    name: sharedValidationSchemas.textNoHtml.optional().max(100),
    description: sharedValidationSchemas.textNoHtml.allow('').optional().max(1000),
    isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  }),
  bulkDelete: Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),
};
