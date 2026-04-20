'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, BadgeAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import adminService from '@/services/admin.service';

import KPICards, { type KPIData } from './KPICards';
import LowStockPanel, { type LowStockProduct } from './LowStockPanel';
import SalesChart, { type MonthlyDataPoint } from './SalesChart';
import OrderTrend, { type OrderTrendPoint } from './OrderTrend';
import TopProducts, { type CategoryDataPoint } from './TopProducts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely unwrap `{ data: { data: ... } }` or `{ data: ... }` */
function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

const asArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const getMonthKey = (value: unknown): string => {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getMonthKeyFromRow = (row: any): string => {
  if (!row || typeof row !== 'object') return '';
  return getMonthKey(
    row.month ?? row.date ?? row.period ?? row.createdAt ?? row.created_at ?? row.label
  );
};

const buildLast12MonthKeys = (): string[] => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const keys: string[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(start);
    monthDate.setUTCMonth(start.getUTCMonth() - i);
    keys.push(getMonthKey(monthDate));
  }

  return keys;
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  const [kpiData, setKpiData]         = useState<KPIData | null>(null);
  const [lowStock, setLowStock]       = useState<LowStockProduct[]>([]);
  const [chartData, setChartData]     = useState<MonthlyDataPoint[]>([]);
  const [orderTrend, setOrderTrend]   = useState<OrderTrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<CategoryDataPoint[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    const role = (user as any)?.role;
    if (role === 'SUPER_ADMIN') {
      router.replace('/superadmin/dashboard');
    }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const last12Keys = buildLast12MonthKeys();

      const [overviewRes, lowStockRes, salesSeriesRes, quotationsRes, categoryRes] =
        await Promise.allSettled([
          adminService.getOverview(),
          adminService.getLowStockProducts(),
          adminService.getMonthlySalesSeries(),
          adminService.getQuotationsTotalCount(),
          adminService.getByCategory(),
        ]);

      // ── KPI cards ──
      if (overviewRes.status === 'fulfilled') {
        const d = unwrap<any>(overviewRes.value);
        const totalQuotations =
          quotationsRes.status === 'fulfilled'
            ? (unwrap<any>(quotationsRes.value)?.total ??
               (quotationsRes.value as any)?.data?.total ??
               0)
            : 0;
        setKpiData({
          totalProducts:  d.totalProducts  ?? 0,
          totalStock:     d.totalStock     ?? 0,
          inventoryValue: d.inventoryValue ?? 0,
          totalRevenue:   d.totalRevenue   ?? 0,
          totalCategories: d.totalCategories ?? 0,
          totalQuotations,
        });
      }

      // ── Low stock ──
      if (lowStockRes.status === 'fulfilled') {
        const d = unwrap<any>(lowStockRes.value);
        setLowStock(Array.isArray(d) ? d : d?.products ?? []);
      }

      // ── Chart: merge revenue + orders by month ──
      const merged: Record<string, MonthlyDataPoint> = {};
      last12Keys.forEach((month) => {
        merged[month] = { month, revenue: 0, orders: 0 };
      });

      const monthlySeriesRaw = salesSeriesRes.status === 'fulfilled' ? salesSeriesRes.value : [];
      const monthlySeries = Array.isArray(monthlySeriesRaw)
        ? monthlySeriesRaw
        : asArray<any>(unwrap<any>(monthlySeriesRaw));

      monthlySeries.forEach((entry: any) => {
        const key = getMonthKeyFromRow(entry);
        if (!key) return;

        const revenue = Number(
          entry?.revenue ?? entry?.totalRevenue ?? entry?.amount ?? entry?.value ?? 0
        );
        const orders = Number(
          entry?.orders ?? entry?.orderCount ?? entry?.totalOrders ?? entry?.count ?? 0
        );

        merged[key] = {
          month: key,
          revenue: Number.isFinite(revenue) ? revenue : 0,
          orders: Number.isFinite(orders) ? orders : 0,
        };
      });

      setChartData(Object.values(merged).sort((a, b) => a.month.localeCompare(b.month)));

      // ── Order Trend (monthly orders as bar chart) ──
      const trendPoints: OrderTrendPoint[] = Object.values(merged)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((entry) => ({
          label: String(entry.month).slice(0, 7),
          orders: Number(entry.orders ?? 0),
        }));
      setOrderTrend(trendPoints);

      // ── Top Products by category ──
      if (categoryRes.status === 'fulfilled') {
        const cats: any[] = unwrap<any[]>(categoryRes.value) ?? [];
        setTopProducts(
          cats
            .map((c: any) => ({
              name: c.categoryName ?? c.name ?? 'Unknown',
              // Prefer sales signals for "Top Selling" donut; only fall back to inventory count.
              value: Number(
                c.orderCount ??
                  c.orders ??
                  c.totalOrders ??
                  c.soldCount ??
                  c.salesCount ??
                  c.revenue ??
                  c.totalRevenue ??
                  c.productCount ??
                  c.count ??
                  c.value ??
                  0
              ),
            }))
            .filter((item) => Number.isFinite(item.value) && item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
        );
      }
    } catch {
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchAll();
    }
  }, [authLoading, isAuthenticated, fetchAll]);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-red-100 min-h-[400px]">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <BadgeAlert className="text-red-500" size={48} aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">{t('error')}</h3>
        <p className="text-gray-500 mt-2 text-center max-w-md">{error}</p>
        <button
          onClick={fetchAll}
          className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#5B5FC7] text-white rounded-xl hover:bg-[#4a4eb6] transition-colors font-semibold"
        >
          <RefreshCcw size={18} aria-hidden="true" />
          {t('retryBtn')}
        </button>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <main
      className="space-y-6 pb-6 animate-in fade-in duration-300"
      aria-label={t('adminDashboard')}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('overviewTitle')}</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{t('overviewSubtitle')}</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          aria-label={t('refreshBtn')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium text-gray-700 bg-white text-sm disabled:opacity-50"
        >
          <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          {t('refreshBtn')}
        </button>
      </div>

      {/* ── Low Stock Alert Panel ── */}
      <LowStockPanel items={lowStock} loading={loading} />

      {/* ── KPI Summary Cards ── */}
      <KPICards data={kpiData} loading={loading} />

      {/* ── Monthly Sales Chart ── */}
      <SalesChart data={chartData} loading={loading} />

      {/* ── Bottom Row: Order Trend + Top Products ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <OrderTrend data={orderTrend} loading={loading} />
        </div>
        <TopProducts data={topProducts} loading={loading} />
      </div>
    </main>
  );
}

