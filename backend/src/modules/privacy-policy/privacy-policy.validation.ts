/**
 * Privacy Policy Validation
 */

import Joi from 'joi';

export const privacyPolicyValidation = {
  update: Joi.object({
    contentEn: Joi.string().required().messages({
      'string.empty': 'English privacy policy content is required',
    }),
    contentAr: Joi.string().required().messages({
      'string.empty': 'Arabic privacy policy content is required',
    }),
  }),
};
