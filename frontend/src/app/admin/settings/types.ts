// ─────────────────────────────────────────────────────────────────────
// Admin Settings Module — Shared Types & Constants
// ─────────────────────────────────────────────────────────────────────

import type { SystemSettings } from '@/services/settings.service';

export type SettingsTab =
  | 'general'
  | 'company'
  | 'localization'
  | 'inventory'
  | 'notification'
  | 'security';

export interface TabConfig {
  id: SettingsTab;
  labelKey: string;
  icon: string;
  description: string;
}

export const SETTINGS_TABS: TabConfig[] = [
  { id: 'general',      labelKey: 'settingsTabGeneral',      icon: 'Settings',     description: 'settingsTabGeneralDesc' },
  { id: 'company',      labelKey: 'settingsTabCompany',      icon: 'Building2',    description: 'settingsTabCompanyDesc' },
  { id: 'localization', labelKey: 'settingsTabLocalization', icon: 'Globe',        description: 'settingsTabLocalizationDesc' },
  { id: 'inventory',    labelKey: 'settingsTabInventory',    icon: 'Package',      description: 'settingsTabInventoryDesc' },
  { id: 'notification', labelKey: 'settingsTabNotification', icon: 'Bell',         description: 'settingsTabNotificationDesc' },
  { id: 'security',     labelKey: 'settingsTabSecurity',     icon: 'Shield',       description: 'settingsTabSecurityDesc' },
];

// Localization prefs stored in localStorage (UI-only, not persisted to server)
export interface LocalizationPrefs {
  enableArabic: boolean;
  defaultDirection: 'ltr' | 'rtl';
  numberFormat: 'western' | 'arabic';
  currencyPosition: 'before' | 'after';
}

export const DEFAULT_LOCALIZATION_PREFS: LocalizationPrefs = {
  enableArabic: true,
  defaultDirection: 'ltr',
  numberFormat: 'western',
  currencyPosition: 'before',
};

export const LS_LOCALIZATION_KEY = 'shielder_admin_localization_prefs';

export function loadLocalizationPrefs(): LocalizationPrefs {
  if (typeof window === 'undefined') return DEFAULT_LOCALIZATION_PREFS;
  try {
    const raw = localStorage.getItem(LS_LOCALIZATION_KEY);
    return raw ? { ...DEFAULT_LOCALIZATION_PREFS, ...JSON.parse(raw) } : DEFAULT_LOCALIZATION_PREFS;
  } catch {
    return DEFAULT_LOCALIZATION_PREFS;
  }
}

export function saveLocalizationPrefs(prefs: LocalizationPrefs): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_LOCALIZATION_KEY, JSON.stringify(prefs));
}

// Section form state helpers
export type GeneralFormState = Pick<
  SystemSettings,
  'systemName' | 'currency' | 'timezone' | 'dateFormat' | 'language'
>;

export type CompanyFormState = Pick<
  SystemSettings,
  | 'companyName'
  | 'companyNameEn'
  | 'companyNameAr'
  | 'companyEmail'
  | 'companyPhone'
  | 'companyAddress'
  | 'companyLocationEn'
  | 'companyLocationAr'
  | 'companyLogo'
>;

export type NotificationFormState = Pick<
  SystemSettings,
  | 'enableEmailNotifications'
  | 'enableLowStockAlerts'
  | 'lowStockThreshold'
  | 'enableOrderStatusNotifications'
  | 'enablePaymentNotifications'
>;

export type SecurityFormState = Pick<
  SystemSettings,
  | 'passwordMinLength'
  | 'maxLoginAttempts'
  | 'accountLockDurationMinutes'
  | 'sessionTimeoutMinutes'
  | 'enableTwoFactorAuth'
  | 'forceStrongPasswords'
>;

export interface InventoryFormState {
  lowStockThreshold: number;
  enableLowStockAlerts: boolean;
  allowNegativeStock: boolean;
  autoUpdateStockOnCompletion: boolean;
}

export const CURRENCY_OPTIONS = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'QAR', 'BHD', 'OMR'];
export const TIMEZONE_OPTIONS = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain',
  'Asia/Muscat', 'Africa/Cairo', 'Europe/London', 'America/New_York', 'UTC',
];
export const DATE_FORMAT_OPTIONS = [
  'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY',
];
export const LANGUAGE_OPTIONS = [
  { value: 'en', labelKey: 'settingsLangEn' },
  { value: 'ar', labelKey: 'settingsLangAr' },
];
