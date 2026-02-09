/**
 * Super Admin Validation
 */

import Joi from 'joi';
import { UserRole, UserStatus } from '../../common/constants/roles';

export const superAdminValidation = {
  createAdmin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string().optional(),
  }),

  updateRole: Joi.object({
    role: Joi.string()
      .valid(...Object.values(UserRole))
      .required(),
  }),

  updateStatus: Joi.object({
    isActive: Joi.boolean().required(),
  }),

  queryParams: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().optional(),
    role: Joi.string().valid(...Object.values(UserRole)).optional(),
    status: Joi.string().valid(...Object.values(UserStatus)).optional(),
    isActive: Joi.boolean().optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
  }),
};
