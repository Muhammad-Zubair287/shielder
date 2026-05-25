/**
 * System Settings Validation
 */

import Joi from 'joi';

export const settingsValidation = {
  updateGeneral: Joi.object({
    systemName: Joi.string().optional(),          // optional — CompanySettingsForm doesn't own this field
    companyName: Joi.string().optional(),
    companyNameEn: Joi.string().allow(null, '').optional(),
    companyNameAr: Joi.string().allow(null, '').optional(),
    companyLogo: Joi.string().allow(null, ''),
    companyEmail: Joi.string().email().allow(null, '').optional(),
    companyPhone: Joi.string().allow(null, '').optional(),
    companyAddress: Joi.string().allow(null, '').optional(),
    companyLocationEn: Joi.string().allow(null, '').optional(),
    companyLocationAr: Joi.string().allow(null, '').optional(),
    currency: Joi.string().optional(),            // optional — GeneralSettingsForm owns this
    timezone: Joi.string().optional(),            // optional — GeneralSettingsForm owns this
    dateFormat: Joi.string().optional(),          // optional — GeneralSettingsForm owns this
    language: Joi.string().optional(),
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
    paymentGatewayApiKey: Joi.string().allow(null, ''),
    paymentGatewaySecretKey: Joi.string().allow(null, ''),
    paymentWebhookUrl: Joi.string().uri().allow(null, ''),
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
