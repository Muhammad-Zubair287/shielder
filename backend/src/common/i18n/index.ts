/**
 * Backend i18n Utility
 * Single source of truth for all user-facing API messages.
 * Supports EN (default) and AR based on req.locale set by languageMiddleware.
 */

import { en } from './locales/en';
import { ar } from './locales/ar';

type Locale = 'en' | 'ar';

const translations: Record<Locale, Record<string, string>> = { en, ar };

/**
 * Translate a message key into the requested locale.
 * Falls back to English if the key is missing in the target locale.
 * Falls back to the key itself if missing in both.
 *
 * Supports simple interpolation: t('key', 'ar', { count: 5 })
 * resolves {{count}} inside the template string.
 */
export function t(
  key: string,
  locale: string = 'en',
  params?: Record<string, string | number>,
): string {
  const loc: Locale = locale === 'ar' ? 'ar' : 'en';
  let message = translations[loc][key] ?? translations.en[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replaceAll(`{{${k}}}`, String(v));
    }
  }

  return message;
}

/**
 * Map Joi error type codes → i18n keys.
 * The validation middleware uses this to build locale-aware field errors.
 */
export const JOI_ERROR_KEY_MAP: Record<string, string> = {
  'any.required':        'validation.required',
  'string.empty':        'validation.required',
  'object.min':          'validation.required',
  'string.email':        'validation.invalidEmail',
  'string.min':          'validation.stringMin',
  'string.max':          'validation.stringMax',
  'number.min':          'validation.numberMin',
  'number.max':          'validation.numberMax',
  'number.integer':      'validation.numberInteger',
  'number.base':         'validation.numberBase',
  'number.positive':     'validation.numberMin',
  'string.base':         'validation.stringBase',
  'string.pattern.base': 'validation.invalidFormat',
  'string.invalid':      'validation.invalidFormat',
  'string.uri':          'validation.invalidUrl',
  'string.guid':         'validation.invalidUUID',
  'string.uuid':         'validation.invalidUUID',
  'date.base':           'validation.invalidDate',
  'date.min':            'validation.dateFuture',
  'array.min':           'validation.arrayMin',
  'array.max':           'validation.arrayMax',
  'any.only':            'validation.invalidEnum',
  'boolean.base':        'validation.booleanBase',
  'object.unknown':      'validation.unknownField',
  'fullName.lettersOnly':   'validation.fullNameInvalid',
  'inventoryName.invalid':  'validation.invalidInventoryName',
  'phone.invalid':          'validation.invalidPhone',
  'contact.nameInvalid':    'validation.invalidName',
};

/**
 * Translate a single Joi ValidationErrorItem into a localized message string.
 * Uses the error type code when a mapping exists; falls back to the
 * original Joi message (already in English) otherwise.
 * 
 * For custom validators, checks if the message is an i18n key (format: 'namespace.key')
 * and translates it if found.
 */
export function translateJoiError(
  detail: { type: string; message: string; context?: Record<string, any> },
  locale: string,
): string {
  const key = JOI_ERROR_KEY_MAP[detail.type];
  if (key) {
    // Standard Joi type with a mapping
    const params: Record<string, string | number> = {};
    if (detail.context?.limit !== undefined) params.limit = detail.context.limit;
    if (detail.context?.label)              params.label = detail.context.label;
    return t(key, locale, params);
  }
  
  // For custom validators, check if the embedded message is an i18n key.
  if (detail.type === 'any.custom') {
    const customMessage =
      typeof detail.context?.message === 'string'
        ? detail.context.message
        : detail.message;

    const isI18nKey =
      typeof customMessage === 'string' &&
      customMessage.includes('.') &&
      !customMessage.includes('<') &&
      !customMessage.includes('>') &&
      !customMessage.includes(';');

    if (isI18nKey) {
      const translated = t(customMessage, locale);
      if (translated !== customMessage) {
        return translated;
      }
    }

    if (typeof customMessage === 'string' && customMessage) {
      return customMessage;
    }
  }
  
  // Fallback: return the original message as-is
  return detail.message;
}
