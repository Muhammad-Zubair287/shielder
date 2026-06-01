import Joi from 'joi';

const requiredFieldsMessage = 'Required fields are missing';

const sharedFields = {
  categoryId: Joi.string().uuid().required().messages({
    'any.required': 'categoryId is required',
    'string.empty': 'categoryId is required',
    'string.guid': 'categoryId must be a valid UUID',
  }),
  subcategoryId: Joi.string().uuid().allow('', null).optional().messages({
    'string.guid': 'subcategoryId must be a valid UUID',
  }),
  specKey: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'specKey is required',
    'string.empty': 'specKey is required',
    'string.min': 'specKey is required',
  }),
  isRequired: Joi.boolean().required().messages({
    'any.required': 'isRequired is required',
  }),
  unit: Joi.string().trim().max(50).allow('', null).optional(),
};

export const specTemplateValidation = {
  create: Joi.object(sharedFields)
    .min(1)
    .messages({
      'object.min': requiredFieldsMessage,
    }),

  update: Joi.object({
    categoryId: sharedFields.categoryId.optional(),
    subcategoryId: sharedFields.subcategoryId,
    specKey: sharedFields.specKey.optional(),
    isRequired: sharedFields.isRequired.optional(),
    unit: sharedFields.unit,
  })
    .min(1)
    .messages({
      'object.min': requiredFieldsMessage,
    }),
};