'use client';

import React from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── FormSection ────────────────────────────────────────────────────────────
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  return (
    <div className={`border-b border-gray-100 pb-6 last:border-0 last:pb-0 ${isRTL ? 'text-right' : ''}`}>
      <h3 className="text-sm font-bold text-gray-800 mb-0.5">{title}</h3>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}
      {!description && <div className="mb-4" />}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── FormRow ────────────────────────────────────────────────────────────────
export function FormRow({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const { isRTL } = useLanguage();
  return (
    <div>
      <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : ''}`}>{hint}</p>
      )}
      {error && (
        <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>{error}</p>
      )}
    </div>
  );
}

// ─── TextInput ───────────────────────────────────────────────────────────────
export function TextInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  error = false,
  dir,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  const { isRTL } = useLanguage();
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      dir={dir ?? (isRTL ? 'rtl' : 'ltr')}
      className={[
        'w-full h-10 rounded-xl border px-3 text-sm bg-white text-gray-800 placeholder-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition',
        error ? 'border-red-400' : 'border-gray-200',
        disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : '',
        isRTL ? 'text-right' : '',
      ].join(' ')}
    />
  );
}

// ─── SelectInput ─────────────────────────────────────────────────────────────
export function SelectInput({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  const { isRTL } = useLanguage();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white text-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition appearance-none',
        disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : '',
        isRTL ? 'text-right' : '',
      ].join(' ')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────
export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const { isRTL } = useLanguage();
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={isRTL ? 'text-right' : ''}>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex flex-shrink-0 h-6 w-11 rounded-full border-2 border-transparent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/40',
          checked ? 'bg-[#FF6B35]' : 'bg-gray-200',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// ─── NumberInput ──────────────────────────────────────────────────────────────
export function NumberInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  error = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  error?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={[
        'w-full h-10 rounded-xl border px-3 text-sm bg-white text-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition',
        error ? 'border-red-400' : 'border-gray-200',
        disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : '',
      ].join(' ')}
    />
  );
}

// ─── SaveBar ─────────────────────────────────────────────────────────────────
export function SaveBar({
  dirty,
  saving,
  onSave,
  onReset,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  const { t, isRTL } = useLanguage();
  if (!dirty && !saving) return null;
  return (
    <div
      className={`flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}
    >
      <p className="text-xs text-amber-600 font-medium">{t('settingsUnsavedChanges')}</p>
      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          type="button"
          onClick={onReset}
          disabled={saving}
          className="h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {t('settingsDiscard')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-[#5B5FC7] text-white text-sm font-bold hover:bg-[#4f53c0] transition-colors disabled:opacity-60"
        >
          {saving
            ? <RefreshCw size={13} className="animate-spin" />
            : <Save size={13} />}
          {saving ? t('settingsSaving') : t('settingsSave')}
        </button>
      </div>
    </div>
  );
}
