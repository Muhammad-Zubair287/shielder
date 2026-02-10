import Joi from 'joi';

const specificationTranslationSchema = Joi.object({
  locale: Joi.string().required().length(2),
  label: Joi.string().required().trim().max(100),
});

export const specificationValidation = {
  createDefinition: Joi.object({
    key: Joi.string().required().trim().max(100),
    unit: Joi.string().optional().trim().max(20),
    dataType: Joi.string().valid('NUMBER', 'TEXT', 'BOOLEAN').required(),
    translations: Joi.array().items(specificationTranslationSchema).min(1).required(),
  }),
  bulkCreateDefinitions: Joi.object({
    specifications: Joi.array().items(
      Joi.object({
        key: Joi.string().required().trim().max(100),
        unit: Joi.string().optional().trim().max(20),
        dataType: Joi.string().valid('NUMBER', 'TEXT', 'BOOLEAN').required(),
        translations: Joi.array().items(specificationTranslationSchema).min(1).required(),
      })
    ).min(1).required(),
  }),
};
