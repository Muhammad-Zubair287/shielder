'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCcw,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';
import UsersTable from './UsersTable';
import type { AdminUser, UserFilters, UserPagination } from './types';

export default function AdminUsersPage() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<UserPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: '',
    isActive: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const params: Record<string, unknown> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.search)      params.search   = filters.search;
      if (filters.status)      params.status   = filters.status;
      if (filters.isActive !== '') params.isActive = filters.isActive === 'true';

      const [usersRes, statsRes] = await Promise.all([
        adminService.getAdminManagedUsers(params as any),
        adminService.getAdminManagedUserStats(),
      ]);

      const list: AdminUser[] = usersRes.data ?? [];
      const pg = usersRes.pagination ?? {
        page: 1, limit: 10, total: list.length, totalPages: 1,
      };

      setUsers(list);
      setPagination({
        page: pg.page,
        limit: pg.limit,
        total: pg.total,
        totalPages: pg.totalPages,
      });
      setStats({
        totalUsers: statsRes?.data?.totalUsers ?? pg.total ?? 0,
        activeUsers: statsRes?.data?.activeUsers ?? 0,
        inactiveUsers: statsRes?.data?.inactiveUsers ?? 0,
      });
    } catch {
      toast.error(t('fetchUsersFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, filters, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'ADMIN') fetchUsers();
  }, [authLoading, isAuthenticated, user, fetchUsers]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleFilterChange(key: keyof UserFilters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  async function handleToggleStatus(target: AdminUser) {
    try {
      const newStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await adminService.updateAdminManagedUserStatus(target.id, newStatus);
      toast.success(t('userStatusUpdated'));
      fetchUsers();
    } catch {
      toast.error(t('userUpdateFailed'));
    }
  }

  async function handleDeleteUser(target: AdminUser) {
    try {
      await adminService.deleteAdminManagedUser(target.id);
      toast.success(t('userDeleted'));
      fetchUsers();
    } catch {
      toast.error(t('userDeleteFailed'));
    }
  }

  // ── Auth loading skeleton ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 bg-[#5B5FC7] rounded-full animate-ping opacity-75" />
      </div>
    );
  }

  const summaryCards = [
    {
      label: t('totalUsers'),
      value: stats.totalUsers,
      Icon: Users,
      color: 'text-[#5B5FC7] bg-[#5B5FC7]/10',
    },
    {
      label: t('activeUsers'),
      value: stats.activeUsers,
      Icon: UserCheck,
      color: 'text-green-700 bg-green-100',
    },
    {
      label: t('inactiveUsers'),
      value: stats.inactiveUsers,
      Icon: UserX,
      color: 'text-red-700 bg-red-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className={`flex items-start justify-between gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {t('usersTitle')}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{t('usersSubtitle')}</p>
          </div>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => { setPagination((p) => ({ ...p, page: 1 })); fetchUsers(); }}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-[#5B5FC7] hover:border-[#5B5FC7]/30 transition-colors disabled:opacity-40"
              aria-label={t('refresh')}
            >
              <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/admin/users/create"
              className={`flex items-center gap-2 px-4 py-2.5 bg-[#5B5FC7] text-white text-xs font-bold rounded-xl hover:bg-[#4a4eb0] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <UserPlus size={14} />
              {t('createUser')}
            </Link>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryCards.map(({ label, value, Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={20} />
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-2xl font-black text-gray-900">
                  {loading ? (
                    <span className="inline-block w-12 h-7 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    value.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className={`flex flex-wrap gap-3 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('searchUsers')}
                className={`w-full h-10 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5B5FC7]/50 focus:ring-2 focus:ring-[#5B5FC7]/10 transition-all ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Active status filter */}
            <div className="relative">
              <Filter
                size={13}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <ChevronDown
                size={13}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'left-3' : 'right-3'}`}
              />
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className={`h-10 appearance-none text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#5B5FC7]/50 transition-all cursor-pointer ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="true">{t('userActive')}</option>
                <option value="false">{t('userInactive')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <UsersTable
          users={users}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onToggleStatus={handleToggleStatus}
          onDeleteUser={handleDeleteUser}
        />
      </div>
    </div>
  );
}
