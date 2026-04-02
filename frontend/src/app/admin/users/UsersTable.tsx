'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Eye,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Users,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import RoleBadge from './RoleBadge';
import StatusBadge from './StatusBadge';
import ConfirmModal from './ConfirmModal';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import type { AdminUser, UserPagination } from './types';

interface Props {
  users: AdminUser[];
  loading: boolean;
  pagination: UserPagination;
  onPageChange: (page: number) => void;
  onToggleStatus: (user: AdminUser) => Promise<void>;
  onDeleteUser: (user: AdminUser) => Promise<void>;
}

function formatDate(dateStr: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
];

function avatarColor(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function UsersTable({
  users,
  loading,
  pagination,
  onPageChange,
  onToggleStatus,
  onDeleteUser,
}: Props) {
  const { t, isRTL, locale } = useLanguage();

  const [toggleTarget, setToggleTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const columns = [
    t('usersColUser'),
    t('usersColPhone'),
    t('usersColRole'),
    t('usersColStatus'),
    t('usersColJoined'),
    t('actions'),
  ];

  const skeletonRows = Array.from({ length: 6 });

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleConfirmToggle() {
    if (!toggleTarget) return;
    setActionLoading(true);
    try {
      await onToggleStatus(toggleTarget);
    } finally {
      setActionLoading(false);
      setToggleTarget(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await onDeleteUser(deleteTarget);
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                {columns.map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                      col === t('actions')
                        ? isRTL
                          ? 'text-left'
                          : 'text-right'
                        : isRTL
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                skeletonRows.map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((c) => (
                      <td key={c} className="px-5 py-4">
                        <div className="h-8 bg-gray-100 rounded-lg" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users size={40} className="text-gray-200" />
                      <p className="text-gray-400 font-semibold text-sm">
                        {t('noUsersFound')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const name = user.profile?.fullName;
                  const initials = getInitials(name, user.email);
                  const colorClass = avatarColor(user.id);

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      {/* User (avatar + name + email) */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${colorClass}`}
                          >
                            {initials}
                          </div>
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="text-xs font-bold text-gray-800 truncate max-w-[160px]">
                              {name ?? <span className="text-gray-400 italic">{t('noName')}</span>}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-600">
                          {user.profile?.phoneNumber ?? (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge
                          isActive={user.isActive}
                          status={user.status}
                          size="sm"
                        />
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500">
                          {formatDate(user.createdAt, locale)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className={`px-5 py-4 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                        <div className={`flex items-center gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                          {/* View */}
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#5B5FC7] hover:bg-[#5B5FC7]/8 transition-colors"
                            title={t('viewUser')}
                          >
                            <Eye size={14} />
                          </Link>

                          {/* Edit */}
                          <Link
                            href={`/admin/users/${user.id}?edit=1`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            title={t('editUser')}
                          >
                            <Pencil size={14} />
                          </Link>

                          {/* Toggle active */}
                          <button
                            onClick={() => setToggleTarget(user)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.isActive
                                ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? t('deactivateUser') : t('activateUser')}
                          >
                            {user.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t('deleteUser')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && pagination.totalPages > 1 && (
          <UnifiedPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={onPageChange}
            isRTL={isRTL}
            labels={{
              total: t('total'),
              results: t('totalItems'),
              previous: t('previous'),
              next: t('next'),
            }}
          />
        )}
      </div>

      {/* ── Toggle Status Confirm ── */}
      <ConfirmModal
        open={!!toggleTarget}
        title={
          toggleTarget?.isActive ? t('confirmDeactivateTitle') : t('confirmActivateTitle')
        }
        message={
          toggleTarget?.isActive ? t('confirmDeactivateMsg') : t('confirmActivateMsg')
        }
        confirmLabel={
          toggleTarget?.isActive ? t('deactivateUser') : t('activateUser')
        }
        danger={toggleTarget?.isActive ?? false}
        loading={actionLoading}
        onConfirm={handleConfirmToggle}
        onCancel={() => setToggleTarget(null)}
      />

      {/* ── Delete Confirm ── */}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMsg')}
        confirmLabel={t('deleteUser')}
        danger
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
