/**
 * Terms and Conditions Validation
 */

import Joi from 'joi';

export const termsAndConditionsValidation = {
  update: Joi.object({
    contentEn: Joi.string().required().messages({
      'string.empty': 'English terms and conditions content is required',
    }),
    contentAr: Joi.string().required().messages({
      'string.empty': 'Arabic terms and conditions content is required',
    }),
  }),
};
