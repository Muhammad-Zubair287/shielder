'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import notificationService from '@/services/notification.service';
import type { CreateNotificationPayload } from '@/services/notification.service';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const LIMITS = FIELD_LIMITS.notification;

type TargetRole = 'CUSTOMER' | 'ADMIN' | null;

interface FormState {
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  targetRole: TargetRole;
}

interface FormErrors {
  title?: string;
  titleAr?: string;
  message?: string;
  messageAr?: string;
}

const TARGET_ROLE_OPTIONS: Array<{ value: TargetRole; labelKey: string }> = [
  { value: 'CUSTOMER', labelKey: 'notifTargetCustomer' },
  { value: 'ADMIN',    labelKey: 'notifTargetAdmin' },
  { value: null,       labelKey: 'notifTargetAll' },
];

export default function NotificationForm() {
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();

  const [form, setForm] = useState<FormState>({
    title: '',
    titleAr: '',
    message: '',
    messageAr: '',
    targetRole: 'CUSTOMER',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = (field: keyof FormState, value: string): string => {
    if (field === 'title') {
      if (!value.trim()) return t('notifErrorTitleRequired');
      if (value.length > LIMITS.title) return t('validation.maxLength');
    }
    if (field === 'titleAr') {
      if (!value.trim()) return t('notifErrorTitleArRequired');
      if (value.length > LIMITS.title) return t('validation.maxLength');
    }
    if (field === 'message') {
      if (!value.trim()) return t('notifErrorMessageRequired');
      if (value.length > LIMITS.message) return t('validation.maxLength');
    }
    if (field === 'messageAr') {
      if (!value.trim()) return t('notifErrorMessageArRequired');
      if (value.length > LIMITS.message) return t('validation.maxLength');
    }
    return '';
  };

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const raw = e.target.value;
    const value = field === 'targetRole'
      ? (raw === '' ? null : (raw as TargetRole))
      : raw;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (typeof value === 'string') {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err || undefined }));
    }
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    const err = (f: keyof FormState, v: string) => { const e = validateField(f, v); if (e) errs[f as keyof FormErrors] = e; };
    err('title', form.title);
    err('titleAr', form.titleAr);
    err('message', form.message);
    err('messageAr', form.messageAr);
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    // Send EN title/message — store AR in parentheses suffix for bilingual display
    const displayTitle = locale === 'ar' ? form.titleAr : form.title;
    const displayMessage = locale === 'ar' ? form.messageAr : form.message;

    const payload: CreateNotificationPayload = {
      title: displayTitle,
      message: displayMessage,
      targetRole: form.targetRole ?? undefined,
    };

    try {
      await notificationService.createNotification(payload);
      toast.success(t('notifCreateSuccess'));
      router.push('/admin/notifications');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('notifCreateFailed');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">

        {/* Bilingual title row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title EN */}
          <div>
            <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
              {t('notifFormTitleEn')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              maxLength={LIMITS.title}
              placeholder={t('notifFormTitleEnPh')}
              dir="ltr"
              className={`w-full h-10 rounded-xl border px-3 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Title AR */}
          <div>
            <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
              {t('notifFormTitleAr')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.titleAr}
              onChange={set('titleAr')}
              maxLength={LIMITS.title}
              placeholder={t('notifFormTitleArPh')}
              dir="rtl"
              className={`w-full h-10 rounded-xl border px-3 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition text-right ${errors.titleAr ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.titleAr && <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>{errors.titleAr}</p>}
          </div>
        </div>

        {/* Bilingual message row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Message EN */}
          <div>
            <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
              {t('notifFormMessageEn')} <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.message}
              onChange={set('message')}
              maxLength={LIMITS.message}
              placeholder={t('notifFormMessageEnPh')}
              dir="ltr"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition resize-none ${errors.message ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
          </div>

          {/* Message AR */}
          <div>
            <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
              {t('notifFormMessageAr')} <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.messageAr}
              onChange={set('messageAr')}
              maxLength={LIMITS.message}
              placeholder={t('notifFormMessageArPh')}
              dir="rtl"
              className={`w-full rounded-xl border px-3 py-2.5 text-sm bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition resize-none text-right ${errors.messageAr ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.messageAr && <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>{errors.messageAr}</p>}
          </div>
        </div>

        {/* Target Role */}
        <div className="max-w-xs">
          <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
            {t('notifFormTargetRole')}
          </label>
          <select
            value={form.targetRole ?? ''}
            onChange={set('targetRole')}
            className={`w-full h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition appearance-none ${isRTL ? 'text-right' : ''}`}
          >
            {TARGET_ROLE_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value ?? ''}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : ''}`}>{t('notifFormTargetRoleHint')}</p>
        </div>

        {/* Preview card */}
        <div className={`bg-[#5B5FC7]/[0.04] border border-[#5B5FC7]/20 rounded-2xl p-4 ${isRTL ? 'text-right' : ''}`}>
          <p className="text-xs font-semibold text-[#5B5FC7] uppercase tracking-wide mb-2">{t('notifFormPreview')}</p>
          <p className="text-sm font-bold text-gray-900">{form.title || t('notifFormTitleEnPh')}</p>
          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
            {form.message || t('notifFormMessageEnPh')}
          </p>
          {form.titleAr && (
            <p className="text-sm font-bold text-gray-700 mt-2 text-right" dir="rtl">{form.titleAr}</p>
          )}
          {form.messageAr && (
            <p className="text-sm text-gray-400 mt-0.5 leading-relaxed text-right" dir="rtl">{form.messageAr}</p>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => router.push('/admin/notifications')}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BackIcon size={14} />
            {t('back')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-[#5B5FC7] text-white text-sm font-bold hover:bg-[#4f53c0] transition-colors disabled:opacity-60"
          >
            {submitting
              ? <RefreshCw size={14} className="animate-spin" />
              : <Send size={14} />}
            {submitting ? t('notifSending') : t('notifSend')}
          </button>
        </div>
      </div>
    </form>
  );
}
