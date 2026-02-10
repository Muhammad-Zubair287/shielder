import Joi from 'joi';

const productTranslationSchema = Joi.object({
  locale: Joi.string().required().length(2),
  name: Joi.string().required().trim().max(200),
  description: Joi.string().optional().trim().max(5000),
});

const specificationValueSchema = Joi.object({
  specificationId: Joi.string().uuid().required(),
  value: Joi.string().required(),
});

const attachmentSchema = Joi.object({
  type: Joi.string().valid('IMAGE', 'DATASHEET', 'MANUAL', 'CERTIFICATE').required(),
  fileName: Joi.string().required(),
  fileUrl: Joi.string().uri().required(),
  mimeType: Joi.string().required(),
  size: Joi.number().integer().min(0).required(),
  language: Joi.string().default('en'),
});

export const productValidation = {
  create: Joi.object({
    categoryId: Joi.string().uuid().required(),
    subcategoryId: Joi.string().uuid().required(),
    price: Joi.number().precision(2).positive().required(),
    stock: Joi.number().integer().min(0).default(0),
    translations: Joi.array().items(productTranslationSchema).min(1).required(),
  }),
  update: Joi.object({
    categoryId: Joi.string().uuid().optional(),
    subcategoryId: Joi.string().uuid().optional(),
    price: Joi.number().precision(2).positive().optional(),
    stock: Joi.number().integer().min(0).optional(),
    translations: Joi.array().items(productTranslationSchema).min(1).optional(),
  }),
  assignSpecifications: Joi.object({
    specifications: Joi.array().items(specificationValueSchema).min(1).required(),
  }),
  addAttachment: attachmentSchema,
};
