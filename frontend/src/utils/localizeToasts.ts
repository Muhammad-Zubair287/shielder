import toast from 'react-hot-toast';
import { createT, getDict, type Locale } from '@/i18n/config';

// Flatten nested translation dict into dotted keys -> value
function flattenDict(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flattenDict(val as Record<string, any>, key));
    } else if (typeof val === 'string') {
      out[key] = val;
    }
  }
  return out;
}

let currentLocale: Locale = 'en';
let reverseEnMap: Record<string, string> | null = null;

function ensureReverseMap() {
  if (reverseEnMap) return reverseEnMap;
  const en = getDict('en');
  reverseEnMap = {};
  const flat = flattenDict(en as Record<string, any>);
  for (const k of Object.keys(flat)) reverseEnMap[flat[k]] = k;
  return reverseEnMap;
}

function localizeMessage(raw: unknown, locale: Locale) {
  if (typeof raw !== 'string') return raw;
  const rev = ensureReverseMap();
  const t = createT(locale);

  // Exact match
  if (rev[raw]) return t(rev[raw]);

  // Suffix match (e.g. "ProductName Added to cart")
  for (const [eng, key] of Object.entries(rev)) {
    if (raw.endsWith(eng)) {
      const prefix = raw.slice(0, raw.length - eng.length).trimEnd();
      const translatedSuffix = t(key);
      return prefix ? `${prefix} ${translatedSuffix}` : translatedSuffix;
    }
  }

  // No mapping - return as-is
  return raw;
}

function wrapToastMethod(methodName: keyof typeof toast) {
  const original = (toast as any)[methodName];
  if (typeof original !== 'function') return;
  (toast as any)[methodName] = function (this: any, message: any, ...rest: any[]) {
    try {
      const localized = localizeMessage(message, currentLocale);
      return original.call(this, localized, ...rest);
    } catch (err) {
      return original.call(this, message, ...rest);
    }
  } as any;
}

/**
 * Initialize/refresh runtime localization of react-hot-toast messages.
 * Call this after the app language changes.
 */
export function initLocalizedToasts(locale: Locale) {
  currentLocale = locale;
  ensureReverseMap();
  // Wrap common toast methods
  ['success', 'error', 'loading', 'dismiss', 'remove', 'custom', 'promise'].forEach((m: any) => {
    try { wrapToastMethod(m); } catch (e) { /* ignore */ }
  });
}

export default initLocalizedToasts;
