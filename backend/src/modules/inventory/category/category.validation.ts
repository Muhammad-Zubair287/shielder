import Joi from 'joi';

const categoryTranslationSchema = Joi.object({
  locale: Joi.string().required().length(2),
  name: Joi.string().required().trim().max(100),
  description: Joi.string().optional().trim().max(1000),
});

export const categoryValidation = {
  create: Joi.object({
    translations: Joi.array().items(categoryTranslationSchema).min(1).required(),
  }),
  update: Joi.object({
    translations: Joi.array().items(categoryTranslationSchema).min(1).optional(),
  }),
};
