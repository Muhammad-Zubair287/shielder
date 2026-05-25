'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  type Locale,
  type TranslationKey,
  createT,
  isRTLLocale,
  localeDir,
  DEFAULT_LOCALE,
} from '@/i18n/config';
import initLocalizedToasts from '@/utils/localizeToasts';
import { STORAGE_KEYS } from '@/utils/constants';
import { invalidateLocaleCache } from '@/services/api.service';

type TFunction = (key: TranslationKey | string) => string;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Type-safe translation function. Usage: t('dashboard') */
  t: TFunction;
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LOCALE) as Locale | null;
    if (saved === 'en' || saved === 'ar') {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Keep document attributes fully synchronized for CSS logical direction.
    const dir = localeDir(locale);
    const html = document.documentElement;

    html.dir = dir;
    html.lang = locale;
    html.setAttribute('data-locale', locale);

    document.body.setAttribute('dir', dir);
    document.body.setAttribute('lang', locale);

    localStorage.setItem(STORAGE_KEYS.LOCALE, locale);
    invalidateLocaleCache(); // keep axios interceptor cache in sync
    // Ensure toast messages are localized when locale changes.
    try { initLocalizedToasts(locale); } catch (e) { /* safe to ignore */ }
  }, [locale, mounted]);

  const setLocale = (newLocale: Locale) => setLocaleState(newLocale);

  // Before mount, serve default LTR/English so children render immediately
  // (avoids blank page while waiting for localStorage). After mount the
  // correct locale kicks in; suppressHydrationWarning on <html> handles the diff.
  const activeLocale = mounted ? locale : DEFAULT_LOCALE;

  const value: LanguageContextType = {
    locale: activeLocale,
    setLocale,
    t: createT(activeLocale),
    isRTL: mounted ? isRTLLocale(locale) : false,
    dir: mounted ? localeDir(locale) : 'ltr',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

// Re-export Locale type for consumers that import from this file
export type { Locale };
