'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import adminService from '@/services/admin.service';
import { orderService } from '@/services/order.service';

import DateFilter from './DateFilter';
import SummaryCards from './SummaryCards';
import RevenueChart from './RevenueChart';
import OrdersStatusChart from './OrdersStatusChart';
import TopProductsTable from './TopProductsTable';

import type {
  ReportDateRange,
  ReportSummary,
  RevenuePoint,
  OrderStatusPoint,
  TopProduct,
} from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  processing: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { t, isRTL } = useLanguage();

  const [dateRange, setDateRange] = useState<ReportDateRange>({
    from: daysAgo(30),
    to: today(),
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    lowStockCount: 0,
    totalCustomers: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [statusData, setStatusData] = useState<OrderStatusPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
    }
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ordersRes, lowStockRes, productsRes, usersRes] =
        await Promise.allSettled([
          orderService.getOrders({
            limit: 500,
            dateFrom: dateRange.from,
            dateTo: dateRange.to,
          }),
          adminService.getLowStockCount(),
          adminService.getProductsForManagement({ limit: 10, page: 1, isActive: true }),
          adminService.getAdminManagedUsers({ limit: 1 }),
        ]);

      // ── Revenue from orders ────────────────────────────────────────────────
      const ordersData =
        ordersRes.status === 'fulfilled'
          ? ((ordersRes.value?.data as any)?.orders ?? (ordersRes.value as any)?.orders ?? [])
          : [];

      const pendingOrders = ordersData.filter((o: any) => String(o.status || '').toUpperCase() === 'PENDING').length;
      const processingOrders = ordersData.filter((o: any) => String(o.status || '').toUpperCase() === 'PROCESSING').length;
      const completedOrders = ordersData.filter((o: any) => {
        const s = String(o.status || '').toUpperCase();
        return s === 'COMPLETED' || s === 'DELIVERED';
      }).length;
      const cancelledOrders = ordersData.filter((o: any) => String(o.status || '').toUpperCase() === 'CANCELLED').length;
      const totalOrders = ordersData.length;

      // ── Order status chart data ────────────────────────────────────────────
      const newStatusData: OrderStatusPoint[] = [
        { name: 'Pending', nameKey: 'orderStatusPending', value: pendingOrders, color: STATUS_COLORS.pending },
        { name: 'Processing', nameKey: 'orderStatusProcessing', value: processingOrders, color: STATUS_COLORS.processing },
        { name: 'Completed', nameKey: 'orderStatusCompleted', value: completedOrders, color: STATUS_COLORS.completed },
        { name: 'Cancelled', nameKey: 'orderStatusCancelled', value: cancelledOrders, color: STATUS_COLORS.cancelled },
      ].filter((d) => d.value > 0);
      setStatusData(newStatusData);

      let totalRevenue = 0;
      const dayMap: Record<string, { revenue: number; orders: number }> = {};

      for (const order of ordersData) {
        const paid = order.paymentStatus === 'PAID';
        const day = (order.createdAt as string)?.slice(0, 10) ?? '';
        if (!dayMap[day]) dayMap[day] = { revenue: 0, orders: 0 };
        dayMap[day].orders += 1;
        if (paid) {
          const amt = Number(order.total ?? 0);
          totalRevenue += amt;
          dayMap[day].revenue += amt;
        }
      }

      const newRevenueData: RevenuePoint[] = Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }));
      setRevenueData(newRevenueData);

      // ── Low stock ──────────────────────────────────────────────────────────
      const lowStockRaw =
        lowStockRes.status === 'fulfilled' ? lowStockRes.value : null;
      const lowStockCount =
        (lowStockRaw?.data as any)?.lowStockCount ??
        (lowStockRaw?.data as any)?.count ??
        0;

      // ── Top products ───────────────────────────────────────────────────────
      const prodRaw =
        productsRes.status === 'fulfilled'
          ? ((productsRes.value?.data as any)?.products ?? (productsRes.value?.data as any)?.items ?? [])
          : [];

      const newTopProducts: TopProduct[] = prodRaw
        .map((p: any) => ({
          id: String(p.id ?? p._id ?? ''),
          name: p.name ?? p.translations?.find((tr: any) => tr.language === 'en')?.name ?? '',
          nameAr:
            p.nameAr ?? p.translations?.find((tr: any) => tr.language === 'ar')?.name,
          sku: p.sku ?? null,
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? p.stockQuantity ?? 0),
          totalValue: Number(p.price ?? 0) * Number(p.stock ?? p.stockQuantity ?? 0),
        }))
        .sort((a: TopProduct, b: TopProduct) => b.totalValue - a.totalValue)
        .slice(0, 10);
      setTopProducts(newTopProducts);

      // ── Total customers ────────────────────────────────────────────────────
      const usersRaw =
        usersRes.status === 'fulfilled' ? usersRes.value : null;
      const totalCustomers =
        (usersRaw?.data as any)?.pagination?.total ?? 0;

      // ── Set summary ────────────────────────────────────────────────────────
      setSummary({
        totalRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        lowStockCount,
        totalCustomers,
      });
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError(t('reportLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [dateRange, t]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchAll();
    }
  }, [fetchAll, isAuthenticated, user]);

  // ── Loading / auth spinner ─────────────────────────────────────────────────
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw size={28} className="animate-spin text-[#5B5FC7]" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <BarChart2 size={22} className="text-[#5B5FC7]" />
            <h1 className="text-2xl font-black text-gray-900">{t('reportTitle')}</h1>
          </div>
          <p className="text-sm text-gray-500">{t('reportSubtitle')}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm border border-red-100">
          {error}
        </div>
      )}

      {/* Date filter */}
      <DateFilter
        dateRange={dateRange}
        loading={loading}
        onApply={setDateRange}
        onRefresh={fetchAll}
      />

      {/* KPI cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <RevenueChart data={revenueData} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          <OrdersStatusChart data={statusData} loading={loading} />
        </div>
      </div>

      {/* Top products */}
      <TopProductsTable products={topProducts} loading={loading} />
    </div>
  );
}
