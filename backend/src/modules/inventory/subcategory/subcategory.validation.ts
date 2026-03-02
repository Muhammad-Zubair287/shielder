import Joi from 'joi';

export const subcategoryValidation = {
  create: Joi.object({
    categoryId: Joi.string().uuid().required(),
    // Bilingual mode (sent by the admin frontend)
    nameEn: Joi.string().trim().max(100),
    descriptionEn: Joi.string().allow('').trim().max(1000),
    nameAr: Joi.string().allow('').trim().max(100),
    descriptionAr: Joi.string().allow('').trim().max(1000),
    // Legacy single-locale fallback
    name: Joi.string().trim().max(100),
    description: Joi.string().allow('').trim().max(1000),
    isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  }).or('nameEn', 'name'), // at least one of nameEn or name must be present
  update: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    nameEn: Joi.string().trim().max(100).optional(),
    descriptionEn: Joi.string().allow('').trim().max(1000).optional(),
    nameAr: Joi.string().allow('').trim().max(100).optional(),
    descriptionAr: Joi.string().allow('').trim().max(1000).optional(),
    name: Joi.string().optional().trim().max(100),
    description: Joi.string().allow('').optional().trim().max(1000),
    isActive: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  }),
};
