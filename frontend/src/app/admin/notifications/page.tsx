'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Plus,
  RefreshCw,
  Search,
  CheckCheck,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import notificationService from '@/services/notification.service';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import NotificationsList from './NotificationsList';
import type { AdminNotification, NotificationFilter, Pagination } from './types';

const FILTERS: NotificationFilter[] = ['ALL', 'UNREAD', 'READ'];
const POLL_INTERVAL = 30_000;

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t, isRTL } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h3 className="text-base font-bold text-gray-900">{t('notifDeleteTitle')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('notifDeleteMsg')}</p>
          </div>
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-10 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { t, isRTL } = useLanguage();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, totalPages: 1 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setCurrentPage(1); }, [filter, debouncedSearch]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, limit: 15 };
      if (filter === 'UNREAD') params.read = false;
      if (filter === 'READ') params.read = true;
      if (debouncedSearch) params.search = debouncedSearch;

      const [notifRes, countRes] = await Promise.allSettled([
        notificationService.getNotifications(params),
        notificationService.getUnreadCount(),
      ]);

      if (notifRes.status === 'fulfilled') {
        const d = notifRes.value.data;
        setNotifications(d?.notifications ?? []);
        setPagination(d?.pagination ?? { page: 1, total: 0, totalPages: 1 });
      }
      if (countRes.status === 'fulfilled') {
        setUnreadCount(countRes.value.data?.data?.count ?? 0);
      }
    } catch {
      if (!silent) toast.error(t('notifFetchFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filter, debouncedSearch, t]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') fetchNotifications();
  }, [fetchNotifications, isAuthenticated, user]);

  // ── Polling ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') return;
    pollingRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchNotifications, isAuthenticated, user]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleMarkRead = async (id: string) => {
    setMarkingId(id);
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success(t('notifMarkedRead'));
    } catch {
      toast.error(t('notifMarkReadFailed'));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t('notifAllMarkedRead'));
    } catch {
      toast.error(t('notifMarkReadFailed'));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalId) return;
    const id = deleteModalId;
    setDeletingId(id);
    try {
      await notificationService.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (target && !target.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      toast.success(t('notifDeleted'));
    } catch {
      toast.error(t('notifDeleteFailed'));
    } finally {
      setDeletingId(null);
      setDeleteModalId(null);
    }
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw size={28} className="animate-spin text-[#5B5FC7]" />
      </div>
    );
  }

  return (
    <>
      <DeleteModal
        open={!!deleteModalId}
        loading={!!deleteModalId && deletingId === deleteModalId}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModalId(null)}
      />

      <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <Bell size={22} className="text-[#5B5FC7]" />
              <h1 className="text-2xl font-black text-gray-900">{t('notifTitle')}</h1>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-[#5B5FC7] text-white text-xs font-bold px-1.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{t('notifSubtitle')}</p>
          </div>

          <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {markingAll ? <RefreshCw size={14} className="animate-spin" /> : <CheckCheck size={14} />}
                {t('notifMarkAllRead')}
              </button>
            )}
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-60"
              title={t('refresh')}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/admin/notifications/create"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#5B5FC7] text-white text-sm font-bold hover:bg-[#4f53c0] transition-colors"
            >
              <Plus size={14} />
              {t('notifCreate')}
            </Link>
          </div>
        </div>

        {/* Search + Filter */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className={`relative flex-1 max-w-xs ${isRTL ? 'ml-auto' : ''}`}>
            <Search
              size={15}
              className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('notifSearchPlaceholder')}
              className={`w-full h-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7] transition ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-2' : 'right-2'}`}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={[
                  'h-7 px-3 rounded-lg text-xs font-semibold transition-all',
                  filter === f ? 'bg-white text-[#5B5FC7] shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {t(`notifFilter${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <NotificationsList
          notifications={notifications}
          loading={loading}
          markingId={markingId}
          deletingId={deletingId}
          onMarkRead={handleMarkRead}
          onDelete={(id) => setDeleteModalId(id)}
        />

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <UnifiedPagination
            page={currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={15}
            onPageChange={setCurrentPage}
            isRTL={isRTL}
            className="px-0 pt-2"
            labels={{
              showing: t('showing'),
              of: t('of'),
              results: t('results'),
              previous: t('previous'),
              next: t('next'),
            }}
          />
        )}
      </div>
    </>
  );
}
