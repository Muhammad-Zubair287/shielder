'use client';
export const dynamic = 'force-dynamic';

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
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  KeyRound,
  X,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';
import RoleBadge from '../RoleBadge';
import StatusBadge from '../StatusBadge';
import ConfirmModal from '../ConfirmModal';
import type { AdminUser } from '../types';
import { VALIDATION_RULES } from '@/utils/constants';
import { filterPhoneInput } from '@/utils/phoneUtils';

function formatDate(dateStr: string | null | undefined, locale: string) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function getInitials(name?: string | null, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? '?').slice(0, 2).toUpperCase();
}

export default function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { t, isRTL, locale } = useLanguage();
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(searchParams?.get('edit') === '1');
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    fullName: '',
    phoneNumber: '',
    companyName: '',
    status: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Password reset
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Confirm modals
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (authUser?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (authUser?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, authUser, router]);

  // ── Fetch user ─────────────────────────────────────────────────────────────
  async function fetchUser() {
    try {
      const res = await adminService.getAdminManagedUserById(params.id);
      const u: AdminUser = res.data ?? res;
      setUser(u);
      setEditForm({
        fullName: u.profile?.fullName ?? '',
        phoneNumber: u.profile?.phoneNumber ?? '',
        companyName: u.profile?.companyName ?? '',
        status: u.status,
      });
    } catch {
      toast.error(t('fetchUserFailed'));
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated && authUser?.role === 'ADMIN') fetchUser();
  }, [authLoading, isAuthenticated, authUser]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 bg-[#5B5FC7] rounded-full animate-ping opacity-75" />
      </div>
    );
  }

  if (!user) return null;

  // ── Save edit ──────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!user) return;
    const errs: Record<string, string> = {};
    if (!editForm.fullName.trim()) errs.fullName = t('fieldRequired');
    if (editForm.phoneNumber && !VALIDATION_RULES.PHONE_REGEX.test(editForm.phoneNumber))
      errs.phoneNumber = t('invalidPhone');

    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      await adminService.updateAdminManagedUser(user!.id, {
        fullName: editForm.fullName.trim() || undefined,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        companyName: editForm.companyName.trim() || undefined,
        status: editForm.status || undefined,
      });
      toast.success(t('userUpdated'));
      setEditMode(false);
      fetchUser();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? t('userUpdateFailed'));
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle status ──────────────────────────────────────────────────────────
  async function handleToggleStatus() {
    if (!user) return;
    setActionLoading(true);
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await adminService.updateAdminManagedUserStatus(user!.id, newStatus);
      toast.success(t('userStatusUpdated'));
      fetchUser();
    } catch {
      toast.error(t('userUpdateFailed'));
    } finally {
      setActionLoading(false);
      setShowToggleModal(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!user) return;
    setActionLoading(true);
    try {
      await adminService.deleteAdminManagedUser(user!.id);
      toast.success(t('userDeleted'));
      router.push('/admin/users');
    } catch {
      toast.error(t('userDeleteFailed'));
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async function handleResetPw(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const errs: Record<string, string> = {};
    if (!pwForm.password) errs.password = t('fieldRequired');
    else if (pwForm.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) errs.password = t('passwordTooShort');
    else if (!VALIDATION_RULES.PASSWORD_REGEX.test(pwForm.password)) errs.password = t('passwordWeak');
    if (pwForm.password !== pwForm.confirm) errs.confirm = t('passwordMismatch');

    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPwSaving(true);
    try {
      await adminService.resetAdminManagedUserPassword(user!.id, pwForm.password);
      toast.success(t('passwordResetSuccess'));
      setPwForm({ password: '', confirm: '' });
      setShowPwForm(false);
    } catch {
      toast.error(t('userUpdateFailed'));
    } finally {
      setPwSaving(false);
    }
  }

  const fullName = user.profile?.fullName;
  const initials = getInitials(fullName, user.email);

  return (
    <div className="min-h-screen bg-gray-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Back + title ── */}
        <div className="flex items-center justify-between flex-wrap gap-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          <Link
            href="/admin/users"
            className={`inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#5B5FC7] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {!isRTL && <ArrowLeft size={13} />}
            {t('backToUsers')}
            {isRTL && <ArrowLeft size={13} className="rotate-180" />}
          </Link>

          {/* Action buttons */}
          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-[#5B5FC7]/40 hover:text-[#5B5FC7] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Pencil size={13} />
                {t('editUser')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setEditMode(false); setEditErrors({}); }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#5B5FC7] text-white hover:bg-[#4a4eb0] transition-colors disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  {t('saveChanges')}
                </button>
              </>
            )}

            <button
              onClick={() => setShowToggleModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors ${
                user.status === 'ACTIVE'
                  ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                  : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {user.status === 'ACTIVE' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {user.status === 'ACTIVE' ? t('deactivateUser') : t('activateUser')}
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Trash2 size={13} />
              {t('deleteUser')}
            </button>
          </div>
        </div>

        {/* ── Profile Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-50 bg-gradient-to-r from-[#5B5FC7]/5 to-transparent">
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-16 h-16 rounded-2xl bg-[#5B5FC7]/15 flex items-center justify-center text-[#5B5FC7] text-xl font-black flex-shrink-0">
                {initials}
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <h1 className="text-lg font-black text-gray-900">
                  {fullName ?? <span className="text-gray-400 italic text-base">{t('noName')}</span>}
                </h1>
                <p className="text-sm text-gray-500">{user.email}</p>
                <div className={`flex items-center gap-2 mt-2 flex-wrap ${isRTL ? 'justify-end' : ''}`}>
                  <RoleBadge role={user.role} size="sm" />
                  <StatusBadge status={user.status} size="sm" />
                  {user.emailVerified && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider border rounded-full px-2 py-0.5 bg-teal-50 text-teal-700 border-teal-200">
                      <ShieldCheck size={9} />
                      {t('emailVerifiedStatus')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          {!editMode ? (
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: t('emailAddress'), value: user.email, Icon: Mail },
                { label: t('phoneNumber'), value: user.profile?.phoneNumber, Icon: Phone },
                { label: t('companyName'), value: user.profile?.companyName, Icon: Building2 },
                { label: t('usersColJoined'), value: formatDate(user.createdAt, locale), Icon: Calendar },
                { label: t('lastLogin'), value: formatDate(user.lastLoginAt, locale), Icon: Clock },
                { label: t('userStatus'), value: user.status, Icon: User },
              ].map(({ label, value, Icon }) => (
                <div key={label} className={isRTL ? 'text-right' : ''}>
                  <p className={`text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <Icon size={10} />
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {value ?? <span className="text-gray-300">—</span>}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            /* Edit form */
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* fullName */}
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={`text-xs font-bold text-gray-700 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <User size={12} />
                  {t('fullNameEn')}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  className={`h-11 text-sm border rounded-xl bg-gray-50 outline-none px-4 transition-all ${editErrors.fullName ? 'border-red-400' : 'border-gray-200 focus:border-[#5B5FC7]/50'}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                {editErrors.fullName && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{editErrors.fullName}</p>
                )}
              </div>

              {/* phone */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold text-gray-700 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Phone size={12} />
                  {t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, phoneNumber: filterPhoneInput(e.target.value) }))}
                  className={`h-11 text-sm border rounded-xl bg-gray-50 outline-none px-4 transition-all ${editErrors.phoneNumber ? 'border-red-400' : 'border-gray-200 focus:border-[#5B5FC7]/50'}`}
                  dir="ltr"
                />
                {editErrors.phoneNumber && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{editErrors.phoneNumber}</p>
                )}
              </div>

              {/* company */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-bold text-gray-700 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                  <Building2 size={12} />
                  {t('companyName')}
                </label>
                <input
                  value={editForm.companyName}
                  onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                  className="h-11 text-sm border border-gray-200 rounded-xl bg-gray-50 outline-none px-4 focus:border-[#5B5FC7]/50 transition-all"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Password Reset ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowPwForm((v) => !v)}
            className={`w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50/60 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <KeyRound size={16} />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-sm font-bold text-gray-800">{t('resetPassword')}</p>
                <p className="text-xs text-gray-400">{t('resetPasswordSubtitle')}</p>
              </div>
            </div>
            {showPwForm ? <X size={16} className="text-gray-400" /> : <Pencil size={14} className="text-gray-400" />}
          </button>

          {showPwForm && (
            <form onSubmit={handleResetPw} className="px-6 pb-6 border-t border-gray-50">
              <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold text-gray-700 ${isRTL ? 'text-right' : ''}`}>
                    {t('newPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={14}
                      className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
                    />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.password}
                      onChange={(e) => { setPwForm((p) => ({ ...p, password: e.target.value })); setPwErrors({}); }}
                      className={`w-full h-11 text-sm border rounded-xl bg-gray-50 outline-none transition-all ${isRTL ? 'pr-9 pl-11' : 'pl-9 pr-11'} ${pwErrors.password ? 'border-red-400' : 'border-gray-200 focus:border-[#5B5FC7]/50'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 ${isRTL ? 'left-3' : 'right-3'}`}
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {pwErrors.password && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{pwErrors.password}</p>
                  )}
                </div>

                {/* Confirm */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-bold text-gray-700 ${isRTL ? 'text-right' : ''}`}>
                    {t('confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={14}
                      className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
                    />
                    <input
                      type="password"
                      value={pwForm.confirm}
                      onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwErrors({}); }}
                      className={`w-full h-11 text-sm border rounded-xl bg-gray-50 outline-none transition-all ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} ${pwErrors.confirm ? 'border-red-400' : 'border-gray-200 focus:border-[#5B5FC7]/50'}`}
                    />
                  </div>
                  {pwErrors.confirm && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={11} />{pwErrors.confirm}</p>
                  )}
                </div>
              </div>

              <p className={`mt-2 text-[11px] text-gray-400 ${isRTL ? 'text-right' : ''}`}>{t('passwordHint')}</p>

              <div className={`mt-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'justify-end'}`}>
                <button
                  type="button"
                  onClick={() => { setShowPwForm(false); setPwForm({ password: '', confirm: '' }); }}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={pwSaving}
                  className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {pwSaving && <Loader2 size={12} className="animate-spin" />}
                  {t('resetPassword')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        open={showToggleModal}
        title={user.status === 'ACTIVE' ? t('confirmDeactivateTitle') : t('confirmActivateTitle')}
        message={user.status === 'ACTIVE' ? t('confirmDeactivateMsg') : t('confirmActivateMsg')}
        confirmLabel={user.status === 'ACTIVE' ? t('deactivateUser') : t('activateUser')}
        danger={user.status === 'ACTIVE'}
        loading={actionLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setShowToggleModal(false)}
      />

      <ConfirmModal
        open={showDeleteModal}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMsg')}
        confirmLabel={t('deleteUser')}
        danger
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
