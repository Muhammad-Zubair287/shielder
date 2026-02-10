import Joi from 'joi';

const subcategoryTranslationSchema = Joi.object({
  locale: Joi.string().required().length(2),
  name: Joi.string().required().trim().max(100),
  description: Joi.string().optional().trim().max(1000),
});

export const subcategoryValidation = {
  create: Joi.object({
    categoryId: Joi.string().uuid().required(),
    translations: Joi.array().items(subcategoryTranslationSchema).min(1).required(),
  }),
  update: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    translations: Joi.array().items(subcategoryTranslationSchema).min(1).optional(),
  }),
};
