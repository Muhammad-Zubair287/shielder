/**
 * Application Validation Schemas
 */

import Joi from 'joi';
import { sharedValidationSchemas } from '@/common/validation/shared.schemas';

export const applicationValidation = {
  create: Joi.object({
    applicationName: sharedValidationSchemas.textNoHtml.min(1).max(255).required().messages({
      'string.empty': 'Application name is required.',
      'any.required': 'Application name is required.',
    }),
    platform: Joi.string().valid('ANDROID', 'IOS').required().messages({
      'any.only': 'Platform must be ANDROID or IOS.',
      'any.required': 'Platform is required.',
    }),
    downloadUrl: Joi.string().uri().required().messages({
      'string.uri': 'Download URL must be a valid URL.',
      'any.required': 'Download URL is required.',
    }),
    description: sharedValidationSchemas.textNoHtml.max(2000).optional().allow(''),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  }),

  update: Joi.object({
    applicationName: sharedValidationSchemas.textNoHtml.min(1).max(255).optional(),
    platform: Joi.string().valid('ANDROID', 'IOS').optional(),
    downloadUrl: Joi.string().uri().optional(),
    description: sharedValidationSchemas.textNoHtml.max(2000).optional().allow(''),
    status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('ACTIVE', 'INACTIVE').required().messages({
      'any.only': 'Status must be ACTIVE or INACTIVE.',
      'any.required': 'Status is required.',
    }),
  }),
};
