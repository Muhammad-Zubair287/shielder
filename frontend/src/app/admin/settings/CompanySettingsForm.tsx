'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, X, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import settingsService from '@/services/settings.service';
import { broadcastSync } from '@/lib/crossTabSync';
import {
  FormSection, FormRow, TextInput, SaveBar,
} from './FormComponents';
import type { CompanyFormState } from './types';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const S = FIELD_LIMITS.settings;

interface Props { settings: any; onSaved: () => void; }

const EMPTY: CompanyFormState = {
  companyName: '',
  companyNameEn: '',
  companyNameAr: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyLocationEn: '',
  companyLocationAr: '',
  companyLogo: null,
};

const MAX_SIZE_MB = 2;

export default function CompanySettingsForm({ settings, onSaved }: Props) {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState<CompanyFormState>(EMPTY);
  const [orig, setOrig] = useState<CompanyFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    const v: CompanyFormState = {
      companyName: settings.companyName ?? '',
      companyNameEn: settings.companyNameEn ?? settings.companyName ?? '',
      companyNameAr: settings.companyNameAr ?? '',
      companyEmail: settings.companyEmail ?? '',
      companyPhone: settings.companyPhone ?? '',
      companyAddress: settings.companyAddress ?? '',
      companyLocationEn: settings.companyLocationEn ?? settings.companyAddress ?? '',
      companyLocationAr: settings.companyLocationAr ?? '',
      companyLogo: settings.companyLogo ?? null,
    };
    setForm(v);
    setOrig(v);
    setLogoPreview(settings.companyLogo ?? null);
  }, [settings]);

  const dirty = JSON.stringify(form) !== JSON.stringify(orig) || !!logoFile;

  const set = (k: keyof CompanyFormState) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(t('settingsLogoSizeError').replace('{{mb}}', String(MAX_SIZE_MB)));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('settingsLogoTypeError'));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm((p) => ({ ...p, companyLogo: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyNameEn?.trim() && !form.companyName.trim()) e.companyNameEn = t('settingsErrorRequired');
    if (form.companyNameEn && form.companyNameEn.length > S.companyName) e.companyNameEn = t('validation.maxLength');
    if (form.companyNameAr && form.companyNameAr.length > S.companyName) e.companyNameAr = t('validation.maxLength');
    if (form.companyName && form.companyName.length > S.companyName) e.companyName = t('validation.maxLength');
    if (form.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) {
      e.companyEmail = t('invalidEmail');
    }
    if (form.companyEmail && form.companyEmail.length > S.companyEmail) e.companyEmail = t('validation.maxLength');
    if (form.companyPhone && form.companyPhone.length > S.companyPhone) e.companyPhone = t('validation.maxLength');
    if (form.companyAddress && form.companyAddress.length > S.companyAddress) e.companyAddress = t('validation.maxLength');
    if (form.companyLocationEn && form.companyLocationEn.length > S.companyLocation) e.companyLocationEn = t('validation.maxLength');
    if (form.companyLocationAr && form.companyLocationAr.length > S.companyLocation) e.companyLocationAr = t('validation.maxLength');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    // Will hold the server-side path returned by the upload endpoint
    let uploadedLogoPath: string | null = null;
    try {
      // Upload logo first if changed; the backend already persists it to DB.
      // We capture the server path so the subsequent updateSettings call
      // uses the real path instead of a transient blob:// URL.
      if (logoFile) {
        const res = await settingsService.uploadCompanyLogo(logoFile);
        // Backend returns: { data: { companyLogo: '/uploads/...' } }
        uploadedLogoPath = res.data?.data?.companyLogo ?? res.data?.data?.url ?? null;
        if (uploadedLogoPath) setForm((p) => ({ ...p, companyLogo: uploadedLogoPath }));
      }
      await settingsService.updateSettings('general', {
        // Merge required general fields from existing settings so backend validation passes
        systemName: settings?.systemName || 'Shielder',
        currency: settings?.currency || 'USD',
        timezone: settings?.timezone || 'UTC',
        dateFormat: settings?.dateFormat || 'MM/DD/YYYY',
        ...form,
        // Keep legacy fields populated for backward compatibility.
        companyName: form.companyNameEn || form.companyName || '',
        companyAddress: form.companyLocationEn || form.companyAddress || '',
        // Use the actual server path (not blob:// preview URL)
        companyLogo: uploadedLogoPath ?? form.companyLogo,
      });
      setOrig(form);
      setLogoFile(null);
      toast.success(t('settingsSavedSuccess'));
      broadcastSync({ type: 'DATA_CHANGED', module: 'settings' });
      broadcastSync({ type: 'QUERY_INVALIDATE', keys: ['public-settings', 'settings'] });
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('settingsSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <FormSection title={t('settingsCompanyLogo')} description={t('settingsCompanyLogoDesc')}>
        <div className={`flex items-start gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
            {logoPreview
              ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain" />
              : <Building2 size={28} className="text-gray-300" />}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Upload size={13} />
              {t('settingsUploadLogo')}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <X size={12} />
                {t('settingsRemoveLogo')}
              </button>
            )}
            <p className="text-xs text-gray-400">{t('settingsLogoHint').replace('{{mb}}', String(MAX_SIZE_MB))}</p>
          </div>
        </div>
      </FormSection>

      {/* Company details */}
      <FormSection title={t('settingsCompanyDetails')} description={t('settingsCompanyDetailsDesc')}>
        <FormRow label={t('settingsCompanyNameEn') || 'Company Name (English)'} required error={errors.companyNameEn}>
          <TextInput
            value={form.companyNameEn || ''}
            onChange={set('companyNameEn')}
            placeholder={t('settingsCompanyNameEnPh') || 'Enter company name in English'}
            error={!!errors.companyNameEn}
            dir="ltr"
            maxLength={S.companyName}
          />
        </FormRow>

        <FormRow label={t('settingsCompanyNameAr') || 'Company Name (Arabic)'} error={errors.companyNameAr}>
          <TextInput
            value={form.companyNameAr || ''}
            onChange={set('companyNameAr')}
            placeholder={t('settingsCompanyNameArPh') || 'ادخل اسم الشركة بالعربية'}
            dir="rtl"
            maxLength={S.companyName}
            error={!!errors.companyNameAr}
          />
        </FormRow>

        <FormRow label={t('settingsCompanyName')} error={errors.companyName}>
          <TextInput
            value={form.companyName}
            onChange={set('companyName')}
            placeholder={t('settingsCompanyNamePh')}
            error={!!errors.companyName}
            maxLength={S.companyName}
          />
        </FormRow>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label={t('settingsCompanyEmail')} error={errors.companyEmail}>
            <TextInput
              value={form.companyEmail}
              onChange={set('companyEmail')}
              type="email"
              placeholder="contact@company.com"
              error={!!errors.companyEmail}
              dir="ltr"
              maxLength={S.companyEmail}
            />
          </FormRow>
          <FormRow label={t('settingsCompanyPhone')} error={errors.companyPhone}>
            <TextInput
              value={form.companyPhone}
              onChange={set('companyPhone')}
              placeholder="+966 5x xxx xxxx"
              dir="ltr"
              maxLength={S.companyPhone}
              error={!!errors.companyPhone}
            />
          </FormRow>
        </div>

        <FormRow label={t('settingsCompanyLocationEn') || 'Company Location (English)'} error={errors.companyLocationEn}>
          <TextInput
            value={form.companyLocationEn || ''}
            onChange={set('companyLocationEn')}
            placeholder={t('settingsCompanyLocationEnPh') || 'Enter company location in English'}
            dir="ltr"
            maxLength={S.companyLocation}
            error={!!errors.companyLocationEn}
          />
        </FormRow>

        <FormRow label={t('settingsCompanyLocationAr') || 'Company Location (Arabic)'} error={errors.companyLocationAr}>
          <TextInput
            value={form.companyLocationAr || ''}
            onChange={set('companyLocationAr')}
            placeholder={t('settingsCompanyLocationArPh') || 'ادخل عنوان الشركة بالعربية'}
            dir="rtl"
            maxLength={S.companyLocation}
            error={!!errors.companyLocationAr}
          />
        </FormRow>

        <FormRow label={t('settingsCompanyAddress')} error={errors.companyAddress}>
          <TextInput
            value={form.companyAddress}
            onChange={set('companyAddress')}
            placeholder={t('settingsCompanyAddressPh')}
            maxLength={S.companyAddress}
            error={!!errors.companyAddress}
          />
        </FormRow>
      </FormSection>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onReset={() => { setForm(orig); setErrors({}); setLogoFile(null); setLogoPreview(orig.companyLogo); }}
      />
    </div>
  );
}
