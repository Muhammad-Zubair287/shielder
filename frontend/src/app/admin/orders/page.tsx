'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCcw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Filter,
  Calendar,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { orderService } from '@/services/order.service';
import OrdersTable from './OrdersTable';
import type { Order, OrderSummary, Pagination } from './types';

type Filters = {
  search: string;
  status: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
};

export default function AdminOrdersPage() {
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
  });

  // ── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
        ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
      };
      const res = await orderService.getOrders(params);
      setOrders(res.orders || []);
      setPagination((p) => ({
        ...p,
        total: res.pagination?.total ?? 0,
        pages: res.pagination?.pages ?? 1,
      }));
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error(err?.response?.data?.message || t('fetchOrdersFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, filters, t]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await orderService.getOrderSummary();
      const d = res.data || res;
      setSummary({
        totalOrders:     d.totalOrders     ?? d.total     ?? 0,
        pendingOrders:   d.pendingOrders   ?? d.pending   ?? 0,
        completedOrders: d.completedOrders ?? d.completed ?? 0,
        cancelledOrders: d.cancelledOrders ?? d.cancelled ?? 0,
      });
    } catch {/* silent */}
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
      fetchOrders();
      fetchSummary();
    }
  }, [fetchOrders, fetchSummary, authLoading, isAuthenticated, user]);

  // Reset page on filter change
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const refresh = () => { fetchOrders(); fetchSummary(); };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(n);

  // ── Summary cards ──────────────────────────────────────────────────────────
  const cards = [
    { label: t('totalOrders'),     value: summary.totalOrders,     Icon: TrendingUp,  color: '#5B5FC7' },
    { label: t('pendingOrders'),   value: summary.pendingOrders,   Icon: Clock,       color: '#D97706' },
    { label: t('completedOrders'), value: summary.completedOrders, Icon: CheckCircle2,color: '#16A34A' },
    { label: t('cancelledOrders'), value: summary.cancelledOrders, Icon: XCircle,     color: '#DC2626' },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5B5FC7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="space-y-6 pb-6" dir={isRTL ? 'rtl' : 'ltr'} aria-label={t('ordersTitle')}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('ordersTitle')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('ordersSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2.5 border border-gray-200 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-xl transition-colors disabled:opacity-40"
            title={t('refresh')}
          >
            <RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/admin/orders/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF5722] text-white rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95"
          >
            <Plus size={16} />
            {t('createOrder')}
          </Link>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">{fmt(card.value)}</h3>
            </div>
            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${card.color}18` }}>
              <card.Icon size={22} style={{ color: card.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`}
          />
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder={t('searchOrders')}
            className={`w-full py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Order status filter */}
          <div className="relative">
            <Filter size={13} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className={`py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-8'}`}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="PENDING">{t('orderPending')}</option>
              <option value="READY_FOR_PICKUP">{t('orderReadyForPickup')}</option>
              <option value="CONFIRMED">{t('orderConfirmed')}</option>
              <option value="PROCESSING">{t('orderProcessing')}</option>
              <option value="SHIPPED">{t('orderShipped')}</option>
              <option value="DELIVERED">{t('orderDelivered')}</option>
              <option value="COMPLETED">{t('orderCompleted')}</option>
              <option value="CANCELLED">{t('orderCancelled')}</option>
            </select>
          </div>

          {/* Payment status filter */}
          <select
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
          >
            <option value="">{t('allPaymentStatuses')}</option>
            <option value="PAID">{t('payPaid')}</option>
            <option value="UNPAID">{t('payUnpaid')}</option>
            <option value="PARTIAL">{t('payPartial')}</option>
            <option value="REFUNDED">{t('payRefunded')}</option>
          </select>

          {/* Date range */}
          <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <OrdersTable
        orders={orders}
        loading={loading || refreshing}
        pagination={pagination}
        onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
      />
    </main>
  );
}
