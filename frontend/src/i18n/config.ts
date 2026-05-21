/**
 * Shielder i18n Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Central i18n module. Locale dictionaries live in /public/locales/*.json.
 * This module provides:
 *  - Supported locales & default locale
 *  - RTL locale list
 *  - Type-safe translation key type (TranslationKey)
 *  - getDict() — synchronously resolves the dictionary for a locale
 *  - t() factory — produces a translation lookup function bound to a locale
 */

import en from '../../public/locales/en.json';
import ar from '../../public/locales/ar.json'; // updated

// ─── Types ───────────────────────────────────────────────────────────────────

export type Locale = 'en' | 'ar';

export type TranslationDictionary = Record<string, unknown>;
export type TranslationKey = string;

// ─── Config ──────────────────────────────────────────────────────────────────

/** All supported locales */
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ar'];

/** Default / fallback locale */
export const DEFAULT_LOCALE: Locale = 'en';

/** Locales that render RTL */
export const RTL_LOCALES: Locale[] = ['ar'];

/** Human-readable locale labels */
export const LOCALE_LABELS: Record<Locale, { label: string; native: string; flag: string }> = {
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
  ar: { label: 'Arabic',  native: 'العربية', flag: '🇸🇦' },
};

// ─── Dictionary Map ───────────────────────────────────────────────────────────

const dictionaries: Record<Locale, TranslationDictionary> = { en, ar };

/**
 * Returns the full translation dictionary for the given locale.
 * Falls back to English if the locale is not available.
 */
export function getDict(locale: Locale): TranslationDictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

/**
 * Returns a translation lookup function bound to a specific locale.
 * Usage:
 *   const t = createT('ar');
 *   t('dashboard') // → 'لوحة التحكم'
 *
 * Falls back to the English value (then the key itself) if the key is missing.
 */
export function createT(locale: Locale) {
  const dict = getDict(locale);
  const fallback = getDict(DEFAULT_LOCALE);
  return function t(key: TranslationKey | string): string {
    return (
      (dict as Record<string, unknown>)[key] ??
      (fallback as Record<string, unknown>)[key] ??
      key
    ) as string;
  };
}

/**
 * Returns true when the locale reads right-to-left.
 */
export function isRTLLocale(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/**
 * Returns the HTML dir attribute value for a given locale.
 */
export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return isRTLLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Returns the CSS font-family hint for a given locale.
 * The Cairo font is pre-loaded in the root layout for Arabic.
 */
export function localeFontClass(locale: Locale): string {
  return locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : '';
}
