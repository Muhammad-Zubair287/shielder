'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';
import { VALIDATION_RULES } from '@/utils/constants';
import { FIELD_LIMITS } from '@/constants/fieldLimits';

const U = FIELD_LIMITS.user;

interface FormState {
  fullName: string;
  fullNameAr: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
}

export default function CreateUserPage() {
  const { t, isRTL } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    fullName: '',
    fullNameAr: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 bg-[#5B5FC7] rounded-full animate-ping opacity-75" />
      </div>
    );
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: FormErrors = {};

    if (!form.fullName.trim())
      errs.fullName = t('fieldRequired');
    else if (form.fullName.length > U.fullName)
      errs.fullName = t('validation.maxLength');

    if (!form.email.trim())
      errs.email = t('fieldRequired');
    else if (form.email.length > U.email)
      errs.email = t('validation.maxLength');
    else if (!VALIDATION_RULES.EMAIL_REGEX.test(form.email))
      errs.email = t('invalidEmail');

    if (form.phoneNumber) {
      if (form.phoneNumber.length > U.phoneNumber)
        errs.phoneNumber = t('validation.maxLength');
      else if (!VALIDATION_RULES.PHONE_REGEX.test(form.phoneNumber))
        errs.phoneNumber = t('invalidPhone');
    }

    if (!form.password)
      errs.password = t('fieldRequired');
    else if (form.password.length > U.password)
      errs.password = t('validation.maxLength');
    else if (form.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH)
      errs.password = t('passwordTooShort');
    else if (!VALIDATION_RULES.PASSWORD_REGEX.test(form.password))
      errs.password = t('passwordWeak');

    if (!form.confirmPassword)
      errs.confirmPassword = t('fieldRequired');
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = t('passwordMismatch');

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await adminService.createAdminManagedUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
      });
      toast.success(t('userCreated'));
      router.push('/admin/users');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? t('userCreateFailed');
      if (msg.toLowerCase().includes('email')) {
        setErrors((prev) => ({ ...prev, email: t('emailAlreadyExists') }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function set(key: keyof FormState, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── Field component ────────────────────────────────────────────────────────
  function Field({
    id,
    label,
    icon: Icon,
    type = 'text',
    value,
    placeholder,
    error,
    onChange,
    required = false,
    suffix,
    maxLength,
  }: {
    id: keyof FormState;
    label: string;
    icon: any;
    type?: string;
    value: string;
    placeholder?: string;
    error?: string;
    onChange: (v: string) => void;
    required?: boolean;
    suffix?: React.ReactNode;
    maxLength?: number;
  }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={id}
          className={`text-xs font-bold text-gray-700 ${isRTL ? 'text-right' : ''}`}
        >
          {label}
          {required && <span className="text-red-500 ms-1">*</span>}
        </label>
        <div className="relative">
          <Icon
            size={14}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
          />
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            dir={id === 'fullNameAr' ? 'rtl' : isRTL ? 'rtl' : 'ltr'}
            className={`w-full h-11 text-sm text-gray-800 bg-gray-50 border rounded-xl outline-none transition-all
              ${error ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-[#5B5FC7]/50 focus:ring-2 focus:ring-[#5B5FC7]/10'}
              ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}
              ${suffix ? (isRTL ? 'pl-11' : 'pr-11') : ''}
            `}
          />
          {suffix}
        </div>
        {error && (
          <p className={`flex items-center gap-1 text-[11px] text-red-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle size={11} />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Back + Header ── */}
        <div className="mb-6">
          <Link
            href="/admin/users"
            className={`inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#5B5FC7] transition-colors mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isRTL ? null : <ArrowLeft size={13} />}
            {t('backToUsers')}
            {isRTL ? <ArrowLeft size={13} className="rotate-180" /> : null}
          </Link>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-[#5B5FC7]/10 flex items-center justify-center text-[#5B5FC7]">
              <UserPlus size={18} />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h1 className="text-xl font-black text-gray-900">{t('createUserTitle')}</h1>
              <p className="text-xs text-gray-500">{t('createUserSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* ── Form Card ── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Personal Info section ── */}
            <div className="px-6 py-5 border-b border-gray-50">
              <h2 className={`text-xs font-black uppercase tracking-widest text-gray-400 mb-4 ${isRTL ? 'text-right' : ''}`}>
                {t('personalInfo')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="fullName"
                  label={t('fullNameEn')}
                  icon={User}
                  value={form.fullName}
                  placeholder={t('fullNameEnPh')}
                  error={errors.fullName}
                  onChange={(v) => set('fullName', v)}
                  maxLength={U.fullName}
                  required
                />
                <Field
                  id="fullNameAr"
                  label={t('fullNameAr')}
                  icon={User}
                  value={form.fullNameAr}
                  placeholder={t('fullNameArPh')}
                  onChange={(v) => set('fullNameAr', v)}
                  maxLength={U.fullName}
                />
                <Field
                  id="email"
                  label={t('emailAddress')}
                  icon={Mail}
                  type="email"
                  value={form.email}
                  placeholder={t('emailPlaceholderName')}
                  error={errors.email}
                  onChange={(v) => set('email', v)}
                  maxLength={U.email}
                  required
                />
                <Field
                  id="phoneNumber"
                  label={t('phoneNumber')}
                  icon={Phone}
                  type="tel"
                  value={form.phoneNumber}
                  placeholder={t('phonePh')}
                  error={errors.phoneNumber}
                  onChange={(v) => set('phoneNumber', v)}
                  maxLength={U.phoneNumber}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="companyName"
                    label={t('companyName')}
                    icon={Building2}
                    value={form.companyName}
                    placeholder={t('companyNamePh')}
                    onChange={(v) => set('companyName', v)}
                    maxLength={U.companyName}
                  />
                </div>
              </div>
            </div>

            {/* ── Security section ── */}
            <div className="px-6 py-5 border-b border-gray-50">
              <h2 className={`text-xs font-black uppercase tracking-widest text-gray-400 mb-4 ${isRTL ? 'text-right' : ''}`}>
                {t('security')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="password"
                  label={t('userPassword')}
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  placeholder={t('passwordPlaceholderMin')}
                  error={errors.password}
                  onChange={(v) => set('password', v)}
                  maxLength={U.password}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 ${isRTL ? 'left-3' : 'right-3'}`}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
                <Field
                  id="confirmPassword"
                  label={t('confirmPassword')}
                  icon={Lock}
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  placeholder={t('confirmPasswordPh')}
                  error={errors.confirmPassword}
                  onChange={(v) => set('confirmPassword', v)}
                  maxLength={U.password}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 ${isRTL ? 'left-3' : 'right-3'}`}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              </div>
              <p className={`mt-3 text-[11px] text-gray-400 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                {t('passwordHint')}
              </p>
            </div>

            {/* ── Role note ── */}
            <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-100/60">
              <p className={`text-[11px] text-blue-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                {t('roleRestrictionNote')}
              </p>
            </div>

            {/* ── Actions ── */}
            <div className={`px-6 py-5 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'justify-end'}`}>
              <Link
                href="/admin/users"
                className="px-5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 px-6 py-2.5 bg-[#5B5FC7] text-white text-xs font-bold rounded-xl hover:bg-[#4a4eb0] transition-colors disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                {submitting ? t('creating') : t('createUser')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
