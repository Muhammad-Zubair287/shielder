import Joi from 'joi';

export const cartValidation = {
  addItem: Joi.object({
    productId: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).default(1),
  }),

  updateItem: Joi.object({
    quantity: Joi.number().integer().min(1).required(),
  }),
};
