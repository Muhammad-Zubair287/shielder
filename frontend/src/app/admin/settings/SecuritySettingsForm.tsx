'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import TrustedDeviceList from './TrustedDeviceList';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import authService from '@/services/auth.service';
import settingsService from '@/services/settings.service';
import {
  FormSection, FormRow, NumberInput, ToggleSwitch, SaveBar,
} from './FormComponents';
import type { SecurityFormState } from './types';

interface Props { settings: any; onSaved: () => void; }

const EMPTY: SecurityFormState = {
  passwordMinLength: 8,
  maxLoginAttempts: 5,
  accountLockDurationMinutes: 30,
  sessionTimeoutMinutes: 10,
  enableTwoFactorAuth: false,
  forceStrongPasswords: true,
};

export default function SecuritySettingsForm({ settings, onSaved }: Props) {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState<SecurityFormState>(EMPTY);
  const [orig, setOrig] = useState<SecurityFormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof SecurityFormState, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const v: SecurityFormState = {
      passwordMinLength: settings.passwordMinLength ?? 8,
      maxLoginAttempts: settings.maxLoginAttempts ?? 5,
      accountLockDurationMinutes: settings.accountLockDurationMinutes ?? 30,
      sessionTimeoutMinutes: Math.min(10, Math.max(5, settings.sessionTimeoutMinutes ?? 10)),
      enableTwoFactorAuth: settings.enableTwoFactorAuth ?? false,
      forceStrongPasswords: settings.forceStrongPasswords ?? true,
    };
    setForm(v);
    setOrig(v);
  }, [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(orig);

  const setNum = (k: keyof SecurityFormState) => (v: number) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<keyof SecurityFormState, string>> = {};
    if (form.passwordMinLength < 8 || form.passwordMinLength > 32) {
      e.passwordMinLength = t('settingsSecurityPwLenRange');
    }
    if (form.maxLoginAttempts < 3 || form.maxLoginAttempts > 20) {
      e.maxLoginAttempts = t('settingsSecurityAttemptsRange');
    }
    if (form.sessionTimeoutMinutes < 5 || form.sessionTimeoutMinutes > 10) {
      e.sessionTimeoutMinutes = t('settingsSecuritySessionRange');
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await settingsService.updateSettings('security', form);
      setOrig(form);
      toast.success(t('settingsSavedSuccess'));
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleClearTrustedDevice = () => {
    authService.clearTrustedDeviceToken();
    toast.success('Remembered device cleared');
  };

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className={`flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
        <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">{t('settingsSecurityWarning')}</p>
      </div>

      <FormSection title={t('settingsSecurityPassword')} description={t('settingsSecurityPasswordDesc')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label={t('settingsPasswordMinLength')} error={errors.passwordMinLength} hint="8–32">
            <NumberInput
              value={form.passwordMinLength}
              onChange={setNum('passwordMinLength')}
              min={8}
              max={32}
              error={!!errors.passwordMinLength}
            />
          </FormRow>
        </div>

        <ToggleSwitch
          checked={form.forceStrongPasswords}
          onChange={(v) => setForm((p) => ({ ...p, forceStrongPasswords: v }))}
          label={t('settingsForceStrongPasswords')}
          description={t('settingsForceStrongPasswordsDesc')}
        />
      </FormSection>

      <FormSection title={t('settingsSecurityAccess')} description={t('settingsSecurityAccessDesc')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label={t('settingsMaxLoginAttempts')} error={errors.maxLoginAttempts} hint="3–20">
            <NumberInput
              value={form.maxLoginAttempts}
              onChange={setNum('maxLoginAttempts')}
              min={3}
              max={20}
              error={!!errors.maxLoginAttempts}
            />
          </FormRow>
          <FormRow label={t('settingsAccountLockDuration')} hint={t('settingsMinutes')} error={errors.accountLockDurationMinutes as string | undefined}>
            <NumberInput
              value={form.accountLockDurationMinutes}
              onChange={setNum('accountLockDurationMinutes')}
              min={1}
            />
          </FormRow>
        </div>

        <FormRow label={t('settingsSessionTimeout')} hint={t('settingsMinutes')} error={errors.sessionTimeoutMinutes as string | undefined}>
          <div className="max-w-[200px]">
            <NumberInput
              value={form.sessionTimeoutMinutes}
              onChange={setNum('sessionTimeoutMinutes')}
              min={5}
              max={10}
            />
          </div>
        </FormRow>
      </FormSection>

      <FormSection title={t('settingsSecurityAdvanced')} description={t('settingsSecurityAdvancedDesc')}>
        <ToggleSwitch
          checked={form.enableTwoFactorAuth}
          onChange={(v) => setForm((p) => ({ ...p, enableTwoFactorAuth: v }))}
          label={t('settingsEnable2FA')}
          description={t('settingsEnable2FADesc')}
        />
      </FormSection>

      <FormSection title="Trusted Device" description="Clear the remembered device token stored in this browser.">
        <button
          type="button"
          onClick={handleClearTrustedDevice}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Clear remembered device
        </button>
      </FormSection>

      <FormSection title="Trusted Devices" description="Manage devices remembered by this account.">
        <TrustedDeviceList />
      </FormSection>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={() => { setForm(orig); setErrors({}); }}
      />
    </div>
  );
}
