import Joi from 'joi';

const name = Joi.string().trim().min(1).max(200).required().messages({
  'string.empty': 'Warehouse name is required.',
  'any.required': 'Warehouse name is required.',
  'string.max': 'Warehouse name must not exceed 200 characters.',
});

const address = Joi.string().trim().min(1).max(500).required().messages({
  'string.empty': 'Warehouse address is required.',
  'any.required': 'Warehouse address is required.',
  'string.max': 'Warehouse address must not exceed 500 characters.',
});

const city = Joi.string().trim().min(1).max(100).required().messages({
  'string.empty': 'City is required.',
  'any.required': 'City is required.',
  'string.max': 'City must not exceed 100 characters.',
});

const country = Joi.string().trim().min(1).max(100).required().messages({
  'string.empty': 'Country is required.',
  'any.required': 'Country is required.',
  'string.max': 'Country must not exceed 100 characters.',
});

export const warehouseValidation = {
  create: Joi.object({
    name,
    address,
    city,
    country,
    isMain: Joi.boolean().optional().default(false),
    isActive: Joi.boolean().optional().default(true),
  }),

  update: Joi.object({
    name: name.optional(),
    address: address.optional(),
    city: city.optional(),
    country: country.optional(),
    isMain: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};
