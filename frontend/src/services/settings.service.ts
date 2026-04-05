/**
 * System Settings Service
 */
import api from './api.service';

export interface SystemSettings {
  systemName: string;
  companyName: string;
  companyLogo: string | null;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  language: string;

  // Order
  defaultOrderStatus: string;
  autoCompleteOrderAfterPayment: boolean;
  allowPartialPayment: boolean;
  allowOrderCancellation: boolean;
  autoCancelUnpaidOrdersHours: number | null;

  // Payment
  paymentMethodsEnabled: string[];
  onlinePaymentEnabled: boolean;
  paymentTestMode: boolean;
  paymentGatewayApiKey: string | null;
  paymentGatewaySecretKey: string | null;
  paymentWebhookUrl: string | null;

  // Notification
  enableEmailNotifications: boolean;
  enableLowStockAlerts: boolean;
  lowStockThreshold: number;
  enableOrderStatusNotifications: boolean;
  enablePaymentNotifications: boolean;
  roleNotificationMappings: any;

  // Security
  passwordMinLength: number;
  maxLoginAttempts: number;
  accountLockDurationMinutes: number;
  sessionTimeoutMinutes: number;
  enableTwoFactorAuth: boolean;
  forceStrongPasswords: boolean;

  // Backup
  lastBackupDate: string | null;
  autoBackupSchedule: string | null;
}

const SECTION_FIELDS: Record<string, string[]> = {
  general: [
    'systemName', 'companyName', 'companyLogo', 'companyEmail',
    'companyPhone', 'companyAddress', 'currency', 'timezone', 'dateFormat', 'language',
  ],
  order: [
    'defaultOrderStatus', 'autoCompleteOrderAfterPayment', 'allowPartialPayment',
    'allowOrderCancellation', 'autoCancelUnpaidOrdersHours',
  ],
  payment: [
    'paymentMethodsEnabled', 'onlinePaymentEnabled', 'paymentTestMode',
    'paymentGatewayApiKey', 'paymentGatewaySecretKey', 'paymentWebhookUrl',
  ],
  notification: [
    'enableEmailNotifications', 'enableLowStockAlerts', 'lowStockThreshold',
    'enableOrderStatusNotifications', 'enablePaymentNotifications', 'roleNotificationMappings',
  ],
  security: [
    'passwordMinLength', 'maxLoginAttempts', 'accountLockDurationMinutes',
    'sessionTimeoutMinutes', 'enableTwoFactorAuth', 'forceStrongPasswords',
  ],
};

const settingsService = {
  getSettings: () => {
    return api.get('settings');
  },

  updateSettings: (section: string, data: any) => {
    const fields = SECTION_FIELDS[section];
    let sectionData = fields
      ? Object.fromEntries(fields.map((k) => [k, data[k]]).filter(([, v]) => v !== undefined))
      : { ...data };

    // Ensure paymentMethodsEnabled is always an array (never null)
    if (section === 'payment' && !Array.isArray(sectionData.paymentMethodsEnabled)) {
      sectionData.paymentMethodsEnabled = [];
    }

    // Avoid sending null for optional object payloads.
    if (section === 'notification' && sectionData.roleNotificationMappings == null) {
      delete sectionData.roleNotificationMappings;
    }

    return api.put(`settings/${section}`, sectionData);
  },

  uploadCompanyLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  verifyPassword: (password: string) => {
    return api.post('settings/verify', { password });
  },

  triggerBackup: () => {
    return api.post('settings/backup');
  },

  getLogs: (params: any) => {
    return api.get('settings/logs', { params });
  },

  getSnapshots: () => {
    return api.get('settings/snapshots');
  }};

export default settingsService;
