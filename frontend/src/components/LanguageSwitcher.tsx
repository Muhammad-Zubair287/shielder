'use client';

/**
 * LanguageSwitcher
 * ──────────────────────────────────────────────────────────────────────────
 * Standalone, reusable language-switcher component. Drop it anywhere inside a
 * <LanguageProvider> tree.
 *
 * Variants:
 *  - "dropdown" (default) — globe icon + fly-out menu
 *  - "pills"              — inline EN / AR toggle buttons
 *  - "minimal"            — text-only compact switcher
 *
 * Usage:
 *   <LanguageSwitcher />
 *   <LanguageSwitcher variant="pills" className="my-2" />
 */

import React, { useRef, useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/i18n/config';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'pills' | 'minimal';
  className?: string;
}

// ─── Dropdown Variant ─────────────────────────────────────────────────────────

function DropdownSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch language"
        className="flex items-center gap-1.5 px-2.5 py-2 text-[#191970] hover:bg-gray-100 hover:text-[#191970] rounded-xl text-xs font-bold transition-all"
      >
        <Globe size={16} aria-hidden />
        <span className="hidden sm:inline uppercase tracking-wide">{locale}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className="absolute end-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-gray-50">
            <p className="text-[10px] font-black text-[#0e2441] uppercase tracking-widest">
              Language
            </p>
          </div>

          {SUPPORTED_LOCALES.map(code => {
            const info = LOCALE_LABELS[code];
            return (
              <button
                key={code}
                role="option"
                aria-selected={locale === code}
                onClick={() => { setLocale(code as Locale); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors text-start ${locale === code ? 'bg-[#FF6B35]/5' : ''
                  }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none" aria-hidden>{info.flag}</span>
                  <span className="text-sm font-semibold text-[#0e2441]">{info.native}</span>
                </div>
                {locale === code && (
                  <span className="w-2 h-2 rounded-full bg-[#FF6B35]" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pills Variant ────────────────────────────────────────────────────────────

function PillsSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`flex items-center gap-1 p-1 bg-gray-100 rounded-xl ${className}`}
    >
      {SUPPORTED_LOCALES.map(code => {
        const info = LOCALE_LABELS[code];
        return (
          <button
            key={code}
            onClick={() => setLocale(code as Locale)}
            aria-pressed={locale === code}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${locale === code
                ? 'bg-white text-[#0e2441] shadow-sm'
                : 'text-[#0e2441] hover:text-[#191970]'
              }`}
          >
            {info.native}
          </button>
        );
      })}
    </div>
  );
}

// ─── Minimal Variant ──────────────────────────────────────────────────────────

function MinimalSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  const other = SUPPORTED_LOCALES.find(c => c !== locale) as Locale;
  const otherInfo = LOCALE_LABELS[other];

  return (
    <button
      onClick={() => setLocale(other)}
      aria-label={`Switch to ${otherInfo.label}`}
      className={`text-xs font-bold text-[#0e2441] hover:underline transition-all ${className}`}
    >
      {otherInfo.native}
    </button>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function LanguageSwitcher({ variant = 'dropdown', className }: LanguageSwitcherProps) {
  switch (variant) {
    case 'pills': return <PillsSwitcher className={className} />;
    case 'minimal': return <MinimalSwitcher className={className} />;
    default: return <DropdownSwitcher className={className} />;
  }
}

export default LanguageSwitcher;
