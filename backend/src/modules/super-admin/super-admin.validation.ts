/**
 * Super Admin Validation
 */

import Joi from 'joi';
import { UserRole, UserStatus } from '../../common/constants/roles';
import { sharedValidationSchemas } from '../../common/validation/shared.schemas';

export const superAdminValidation = {
  createAdmin: Joi.object({
    email: Joi.string().email().required(),
    password: sharedValidationSchemas.password,
    fullName: sharedValidationSchemas.textNoHtml.optional(),
    phoneNumber: Joi.string().optional(),
    role: Joi.string().valid(...Object.values(UserRole)).required(),
  }),

  updateRole: Joi.object({
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required(),
  }),

  updateStatus: Joi.object({
    isActive: Joi.boolean().required(),
    suspensionReason: sharedValidationSchemas.textNoHtml.max(500).allow('').optional(),
    suspensionUntil: Joi.date().iso().optional(),
  }),

  deleteAdmin: Joi.object({
    reason: sharedValidationSchemas.textNoHtml.min(3).max(500).allow('').optional(),
    mode: Joi.string().valid('ARCHIVE', 'PERMANENT').default('ARCHIVE'),
  }),

  updateAdmin: Joi.object({
    fullName: sharedValidationSchemas.textNoHtml.optional().allow(''),
    phoneNumber: Joi.string().optional().allow(''),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    isActive: Joi.boolean().optional(),
    status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional().allow(''),
    role: Joi.string().valid(...Object.values(UserRole)).optional().allow(''),
    status: Joi.string().valid(...Object.values(UserStatus)).optional().allow(''),
    isActive: Joi.boolean().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
  }),

  resolveInquiry: Joi.object({
    id: sharedValidationSchemas.uuid,
  }),
};
