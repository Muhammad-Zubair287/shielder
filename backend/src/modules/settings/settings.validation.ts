/**
 * System Settings Validation
 * 
 * SECURITY: All sensitive configuration fields are validated against injection patterns
 * using the security validation utility.
 */

import Joi from 'joi';
import {
  validateSecurityField,
  validatePaymentSettings,
  validateGeneralSettings,
} from '@/common/security/validation.security';

export const settingsValidation = {
  updateGeneral: Joi.object({
    systemName: Joi.string().optional(),          // optional — CompanySettingsForm doesn't own this field
    companyName: Joi.string().trim()
      .optional()
      .max(255)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyName', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyName' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyNameEn: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(255)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyName', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyName' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyNameAr: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(255)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyName', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyName' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyLogo: Joi.string().allow(null, '').optional(),
    favicon: Joi.string().allow(null, '').optional(),
    companyEmail: Joi.string().trim()
      .email()
      .allow(null, '')
      .optional()
      .max(255)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyEmail', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyEmail' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyPhone: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(20)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyPhone', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyPhone' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyAddress: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(500)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyAddress', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyAddress' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyLocationEn: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(500)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyAddress', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyAddress' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    companyLocationAr: Joi.string().trim()
      .allow(null, '')
      .optional()
      .max(500)
      .custom((value, helpers) => {
        if (!value) return value;
        const result = validateSecurityField('companyAddress', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidCompanyAddress' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    currency: Joi.string().optional(),            // optional — GeneralSettingsForm owns this
    timezone: Joi.string().optional(),            // optional — GeneralSettingsForm owns this
    dateFormat: Joi.string().optional(),          // optional — GeneralSettingsForm owns this
    language: Joi.string().optional(),
  }).custom((value, helpers) => {
    // Additional validation for general settings
    const result = validateGeneralSettings(value);
    if (!result.isValid) {
      return helpers.error('any.custom', { message: result.errors[0] || 'Invalid general settings' });
    }
    return value;
  }).messages({
    'any.custom': '{#message}',
  }),

  updateOrder: Joi.object({
    defaultOrderStatus: Joi.string().required(),
    autoCompleteOrderAfterPayment: Joi.boolean().required(),
    allowPartialPayment: Joi.boolean().required(),
    allowOrderCancellation: Joi.boolean().required(),
    autoCancelUnpaidOrdersHours: Joi.number().integer().min(1).allow(null),
  }),

  updatePayment: Joi.object({
    paymentMethodsEnabled: Joi.array().items(Joi.string()).required(),
    onlinePaymentEnabled: Joi.boolean().required(),
    paymentTestMode: Joi.boolean().required(),
    paymentGatewayApiKey: Joi.string().trim()
      .allow(null, '')
      .max(500)
      .custom((value, helpers) => {
        // Allow null or empty
        if (value === null || value === '') {
          return value;
        }
        // Validate security for non-empty values
        const result = validateSecurityField('paymentGatewayApiKey', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidPaymentApiKey' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    paymentGatewaySecretKey: Joi.string().trim()
      .allow(null, '')
      .max(500)
      .custom((value, helpers) => {
        // Allow null or empty
        if (value === null || value === '') {
          return value;
        }
        // Validate security for non-empty values
        const result = validateSecurityField('paymentGatewaySecretKey', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidPaymentSecretKey' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.max': 'settings.credentialsTooLong',
      }),
    paymentWebhookUrl: Joi.string().trim()
      .allow(null, '')
      .max(2048)
      .uri({ scheme: ['http', 'https'] })
      .custom((value, helpers) => {
        // Allow null or empty
        if (value === null || value === '') {
          return value;
        }
        // Validate security for non-empty URLs
        const result = validateSecurityField('paymentWebhookUrl', value);
        if (!result.isValid) {
          return helpers.error('any.custom', { message: result.errors[0] || 'settings.invalidPaymentWebhookUrl' });
        }
        return value;
      })
      .messages({
        'any.custom': '{#message}',
        'string.uri': 'settings.invalidPaymentWebhookUrl',
        'string.max': 'settings.credentialsTooLong',
      }),
  }).custom((value, helpers) => {
    // Additional validation to ensure payment settings are coherent
    const result = validatePaymentSettings(value);
    if (!result.isValid) {
      return helpers.error('any.custom', { message: result.errors[0] || 'Invalid payment settings' });
    }
    return value;
  }).messages({
    'any.custom': '{#message}',
  }),

  updateNotification: Joi.object({
    enableEmailNotifications: Joi.boolean().required(),
    enableLowStockAlerts: Joi.boolean().required(),
    lowStockThreshold: Joi.number().integer().min(0).required(),
    enableOrderStatusNotifications: Joi.boolean().required(),
    enablePaymentNotifications: Joi.boolean().required(),
    roleNotificationMappings: Joi.object().allow(null).optional(),
  }),

  updateSecurity: Joi.object({
    passwordMinLength: Joi.number().integer().min(8).max(32).required(),
    maxLoginAttempts: Joi.number().integer().min(3).max(20).required(),
    accountLockDurationMinutes: Joi.number().integer().min(1).required(),
    sessionTimeoutMinutes: Joi.number().integer().min(5).max(10).required(),
    enableTwoFactorAuth: Joi.boolean().required(),
    forceStrongPasswords: Joi.boolean().required(),
  }),

  verifyPassword: Joi.object({
    password: Joi.string().required(),
  }),

  restoreBackup: Joi.object({
    password: Joi.string().required(),
    backupId: Joi.string().uuid().optional(),
  }),
};
