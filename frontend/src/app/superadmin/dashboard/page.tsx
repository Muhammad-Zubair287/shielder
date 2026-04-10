'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  Layers,
  Activity as ActivityIcon,
  BadgeAlert,
  Clock,
  Search,
  Download,
  Users,
  Boxes,
  DollarSign
} from 'lucide-react';
import adminService from '@/services/admin.service';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Recharts is ~500 KB parsed — lazy-load it so it doesn't block the initial
// dashboard paint. The charts appear after the stats cards are already visible.
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => ({ default: m.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => ({ default: m.Pie })), { ssr: false });

interface DashboardSummary {
  totalProducts: number;
  totalStock: number;
  inventoryValue: number;
  totalRevenue: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
}

interface LowStockProduct {
  id: string;
  translations: { name: string; locale: string }[];
  stock: number;
  minimumStockThreshold: number;
  brand?: { name: string };
  category?: { translations: { name: string; locale: string }[] };
}

interface MonthlyAnalytic {
  month: string;
  orders: number;
  revenue: number;
}

interface Activity {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  type: 'success' | 'pending' | 'issue';
}

interface CategoryBreakdown {
  name: string;
  value: number;
  revenueValue: number;
  ordersValue: number;
  comparisonValue: number;
}

type DatePreset = '3M' | '6M' | '12M' | 'ALL' | 'CUSTOM';
type RevenueBreakdownMode = 'comparison' | 'revenue' | 'orders';
type ActivityViewFilter = 'all' | 'login' | 'permissions' | 'exports' | 'failed';
type ActivityTimeWindow = 'today' | '7d' | 'all';

const KPI_CARD_STYLES = [
  {
    gradient: 'from-indigo-600 to-indigo-500',
    chip: 'bg-indigo-200/30 text-indigo-100',
  },
  {
    gradient: 'from-[#F97216] to-[#e56510]',
    chip: 'bg-orange-200/25 text-orange-100',
  },
  {
    gradient: 'from-violet-600 to-purple-500',
    chip: 'bg-violet-200/30 text-violet-100',
  },
  {
    gradient: 'from-emerald-600 to-green-500',
    chip: 'bg-emerald-200/30 text-emerald-100',
  },
  {
    gradient: 'from-rose-600 to-rose-500',
    chip: 'bg-rose-200/30 text-rose-100',
  },
  {
    gradient: 'from-cyan-600 to-sky-500',
    chip: 'bg-cyan-200/30 text-cyan-100',
  },
];

const PIE_COLORS = ['#5B5FC7', '#16A34A', '#FF6B35', '#0891B2', '#E11D48', '#374151'];
const ORDERS_PIE_COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'];

export default function SuperAdminDashboard() {
  const { t, isRTL } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [analytics, setAnalytics] = useState<MonthlyAnalytic[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('6M');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [breakdownMode, setBreakdownMode] = useState<RevenueBreakdownMode>('comparison');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityViewFilter, setActivityViewFilter] = useState<ActivityViewFilter>('all');
  const [activityTimeWindow, setActivityTimeWindow] = useState<ActivityTimeWindow>('7d');
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedDashboard = useRef(false);

  const fetchActivity = async (window: ActivityTimeWindow = activityTimeWindow) => {
    try {
      setActivityLoading(true);
      const activityRes = await adminService.getActivity({ window, limit: 200 });
      setActivities(activityRes.data.data);
    } catch {
      // Keep existing activity list if a window-specific refresh fails.
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, lowStockRes, analyticsRes, categoryRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getLowStockProducts(),
        adminService.getMonthlySalesSeries(),
        adminService.getByCategory()
      ]);

      setSummary(summaryRes.data.data);
      setLowStock(lowStockRes.data.products || []);
      setAnalytics(Array.isArray(analyticsRes) ? analyticsRes : []);
      const categoryPayload = Array.isArray(categoryRes?.data?.data)
        ? categoryRes.data.data
        : Array.isArray(categoryRes?.data)
          ? categoryRes.data
          : [];
      setCategories(
        categoryPayload
          .map((item: any) => {
            const revenueValue = Number(item.revenue ?? item.totalRevenue ?? item.sales ?? item.value ?? 0);
            const ordersValue = Number(item.orders ?? item.orderCount ?? item.productCount ?? item.count ?? 0);
            const comparisonValue = Number(item.comparison ?? item.score ?? revenueValue ?? 0);

            return {
              name: item.categoryName ?? item.name ?? 'Unknown',
              value: revenueValue,
              revenueValue,
              ordersValue,
              comparisonValue,
            };
          })
          .filter((item: CategoryBreakdown) =>
            item.revenueValue > 0 || item.ordersValue > 0 || item.comparisonValue > 0
          )
          .sort((a: CategoryBreakdown, b: CategoryBreakdown) => b.revenueValue - a.revenueValue)
          .slice(0, 8)
      );
      await fetchActivity(activityTimeWindow);
    } catch (err: any) {
      setError(t('fetchError'));
    } finally {
      hasLoadedDashboard.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!hasLoadedDashboard.current) return;
    fetchActivity(activityTimeWindow);
  }, [activityTimeWindow]);

  const formatShortDate = (raw: string) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return new Intl.DateTimeFormat(isRTL ? 'ar-SA' : 'en-US', {
      month: 'short',
      year: '2-digit',
    }).format(date);
  };

  const normalizedAnalytics = (Array.isArray(analytics) ? analytics : [])
    .map((item) => ({
      month: item?.month,
      orders: Number(item?.orders || 0),
      revenue: Number(item?.revenue || 0),
    }))
    .filter((item) => !!item.month);

  const filteredAnalytics = normalizedAnalytics.filter((item) => {
    const itemDate = new Date(item.month);
    if (Number.isNaN(itemDate.getTime())) {
      return true;
    }

    const now = new Date();
    if (datePreset === 'ALL') {
      return true;
    }

    if (datePreset === 'CUSTOM') {
      if (!customFrom || !customTo) {
        return true;
      }
      const from = new Date(customFrom);
      const to = new Date(customTo);
      return itemDate >= from && itemDate <= to;
    }

    const months = datePreset === '3M' ? 3 : datePreset === '6M' ? 6 : 12;
    const rangeStart = new Date(now);
    rangeStart.setMonth(now.getMonth() - months);
    return itemDate >= rangeStart;
  });

  const filteredAnalyticsTotals = filteredAnalytics.reduce(
    (acc, item) => ({
      revenue: acc.revenue + (Number(item.revenue) || 0),
      orders: acc.orders + (Number(item.orders) || 0),
    }),
    { revenue: 0, orders: 0 }
  );

  const revenueBreakdownData = categories
    .filter((item) => selectedCategory === 'ALL' || item.name === selectedCategory)
    .map((item) => ({
      name: item.name,
      value:
        breakdownMode === 'revenue'
          ? item.revenueValue
          : breakdownMode === 'orders'
            ? item.ordersValue
            : item.comparisonValue,
    }))
    .filter((item) => item.value > 0);

  const modeTotalFromAnalytics =
    breakdownMode === 'orders'
      ? Number(filteredAnalyticsTotals.orders || 0)
      : Number(filteredAnalyticsTotals.revenue || 0);

  const revenueBreakdownTotal = revenueBreakdownData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  const shouldUseCategoryBreakdown =
    modeTotalFromAnalytics > 0 &&
    revenueBreakdownData.length > 0 &&
    Math.abs(revenueBreakdownTotal - modeTotalFromAnalytics) < 0.0001;

  const summaryModeFallback =
    breakdownMode === 'orders'
      ? [{ name: t('totalOrders'), value: modeTotalFromAnalytics }]
      : [{ name: t('totalRevenue'), value: modeTotalFromAnalytics }];

  const chartBreakdownData =
    shouldUseCategoryBreakdown
      ? revenueBreakdownData
      : [];

  const safeBreakdownData =
    chartBreakdownData.length > 0
      ? chartBreakdownData
      : summaryModeFallback;

  const donutColors = breakdownMode === 'orders' ? ORDERS_PIE_COLORS : PIE_COLORS;
  const hasMultipleBreakdownSlices = safeBreakdownData.length > 1;

  const breakdownTotal = safeBreakdownData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const visualBreakdownData =
    breakdownTotal > 0
      ? safeBreakdownData
      : donutColors.map((_, index) => ({
          name: `${breakdownMode}-${index}`,
          value: 1,
        }));

  const pieData = visualBreakdownData.map((item, index) => ({
    ...item,
    fill: donutColors[index % donutColors.length],
  }));

  const resetDashboardFilters = () => {
    setDatePreset('6M');
    setCustomFrom('');
    setCustomTo('');
    setSelectedCategory('ALL');
    setBreakdownMode('comparison');
    setActivityViewFilter('all');
    setActivityTimeWindow('7d');
    setActivitySearch('');
  };

  const getActivityCategory = (action: string): Exclude<ActivityViewFilter, 'all' | 'failed'> => {
    const normalized = action.toLowerCase();
    if (normalized.includes('login') || normalized.includes('auth')) return 'login';
    if (normalized.includes('permission') || normalized.includes('role')) return 'permissions';
    if (normalized.includes('export') || normalized.includes('report')) return 'exports';
    return 'login';
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesText = `${activity.action} ${activity.user}`
      .toLowerCase()
      .includes(activitySearch.toLowerCase());
    const matchesView =
      activityViewFilter === 'all'
        ? true
        : activityViewFilter === 'failed'
          ? activity.type === 'issue'
          : getActivityCategory(activity.action) === activityViewFilter;
    return matchesText && matchesView;
  });

  const getActivityTypeLabel = (type: Activity['type']) => {
    if (type === 'success') return t('monitoringLogTypeSuccess');
    if (type === 'pending') return t('monitoringLogTypePending');
    return t('monitoringLogTypeIssue');
  };

  const activityStats = {
    total: activities.length,
    pending: activities.filter((activity) => activity.type === 'pending').length,
    success: activities.filter((activity) => activity.type === 'success').length,
    failed: activities.filter((activity) => activity.type === 'issue').length,
  };

  const exportActivityCsv = () => {
    const headers = [
      t('activityCsvHeaderAction'),
      t('activityCsvHeaderUser'),
      t('activityCsvHeaderType'),
      t('activityCsvHeaderTimestamp'),
    ];
    const rows = filteredActivities.map((item) => [
      item.action,
      item.user,
      item.type,
      new Date(item.timestamp).toISOString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${t('monitoringLogFilePrefix')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    {
      label: t('totalProducts'),
      value: (summary?.totalProducts ?? 0).toLocaleString(),
      icon: Package,
      href: '/superadmin/products',
      chip: t('drilldownLabelProducts'),
    },
    {
      label: t('totalStock'),
      value: (summary?.totalStock ?? 0).toLocaleString(),
      icon: Boxes,
      href: '/superadmin/products?tab=inventory',
      chip: t('drilldownLabelStock'),
    },
    {
      label: t('inventoryValue'),
      value: `${(summary?.inventoryValue ?? 0).toLocaleString()} ${t('sarCurrency')}`,
      icon: TrendingUp,
      href: '/superadmin/reports',
      chip: t('drilldownLabelValue'),
    },
    {
      label: t('totalRevenue'),
      value: `${(summary?.totalRevenue ?? 0).toLocaleString()} ${t('sarCurrency')}`,
      icon: DollarSign,
      href: '/superadmin/reports?tab=revenue',
      chip: t('drilldownLabelRevenue'),
    },
    {
      label: t('totalCategories'),
      value: (summary?.totalCategories ?? 0).toLocaleString(),
      icon: ActivityIcon,
      href: '/superadmin/categories',
      chip: t('drilldownLabelCategories'),
    },
    {
      label: t('totalUsers'),
      value: (summary?.totalUsers ?? 0).toLocaleString(),
      icon: Users,
      href: '/superadmin/users',
      chip: t('drilldownLabelUsers'),
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-red-100 min-h-[400px]">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <BadgeAlert className="text-red-500" size={48} />
        </div>
        <h3 className="text-xl font-bold" style={{color:'var(--color-tertiary)'}}>{t('dataFetchError')}</h3>
        <p className="text-gray-500 mt-2 text-center max-w-md">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-6 flex items-center gap-2 px-6 py-3 btn-secondary rounded-xl font-semibold"
        >
          <RefreshCcw size={18} />
          {t('retryBtn')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">{t('overviewTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('saOverviewSubtitle')}</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-gray-700 bg-white"
        >
          <RefreshCcw size={16} />
          {t('refreshBtn')}
        </button>
      </div>

      {/* 3. LOW STOCK ALERT CARD */}
      <section>
        {lowStock.length > 0 ? (
          <div className="bg-red-50 border-l-[6px] border-red-500 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-[#DC2626] p-2 rounded-lg text-white">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">{t('lowStockAlerts')}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {lowStock.slice(0, 6).map((product) => (
                <div key={product.id} className="bg-white p-4 rounded-xl border border-red-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold line-clamp-1 text-gray-800">{product.translations?.[0]?.name}</h4>
                      {product.stock <= 2 ? (
                        <span className="px-2 py-1 bg-red-100 text-red-500 text-[10px] font-black rounded uppercase">{t('criticalBadge')}</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase">{t('lowBadge')}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{t('supplierLabel')}: <span className="text-gray-700 font-medium">{product.brand?.name || t('noDataAvailable')}</span></p>
                    <p className="text-sm font-semibold">{t('stock')}: <span className={product.stock <= 2 ? 'text-red-500' : 'text-yellow-700'}>{product.stock} {t('stockUnits')}</span></p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Link 
                href="/superadmin/products?filter=lowstock"
                className="flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:underline"
              >
                {t('manageInventory')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#F0FDF4] border-l-[6px] border-[#16A34A] rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="bg-[#16A34A] p-2 rounded-lg text-white">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#DC2626]">{t('lowStockAlerts')}</h2>
              <p className="text-gray-600">{t('lowStockAreaDesc')}</p>
            </div>
          </div>
        )}
      </section>

      {/* 4. DASHBOARD STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {kpiCards.map((item, index) => (
          <StatsCard
            key={item.label}
            label={item.label}
            value={item.value}
            chip={item.chip}
            icon={item.icon}
            href={item.href}
            detailsLabel={t('kpiDetails')}
            gradientClass={KPI_CARD_STYLES[index % KPI_CARD_STYLES.length].gradient}
            chipClass={KPI_CARD_STYLES[index % KPI_CARD_STYLES.length].chip}
          />
        ))}
      </div>

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 block">{t('dashboardFilterDateRange')}</label>
            <div className="flex flex-wrap gap-2">
              {(['3M', '6M', '12M', 'ALL', 'CUSTOM'] as DatePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    datePreset === preset
                      ? 'bg-[#5B5FC7] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset === '3M' && t('dashboardPreset3M')}
                  {preset === '6M' && t('dashboardPreset6M')}
                  {preset === '12M' && t('dashboardPreset12M')}
                  {preset === 'ALL' && t('dashboardPresetAll')}
                  {preset === 'CUSTOM' && t('dashboardPresetCustom')}
                </button>
              ))}
            </div>
            {datePreset === 'CUSTOM' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}
          </div>

          <div className="w-full xl:w-56">
            <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 block">{t('dashboardFilterCategory')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="ALL">{t('dashboardFilterAllCategories')}</option>
              {categories.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div className="w-full xl:w-72">
            <label className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 block">{t('dashboardRevenueBreakdown')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['comparison', 'revenue', 'orders'] as RevenueBreakdownMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setBreakdownMode(mode)}
                  className={`px-2 py-2 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-colors ${
                    breakdownMode === mode
                      ? 'bg-[#0F172A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'comparison' && t('dashboardModeComparison')}
                  {mode === 'revenue' && t('dashboardModeRevenue')}
                  {mode === 'orders' && t('dashboardModeOrders')}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full xl:w-auto xl:self-end">
            <button
              onClick={resetDashboardFilters}
              className="w-full xl:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('reset')}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 5. ANALYTICS SECTION */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[520px]">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-[#5B5FC7]">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{t('salesGraph')}</h3>
          </div>
          <div className="w-full h-[320px] min-h-[320px]">
            {filteredAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={filteredAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#6B7280', fontSize: 12}}
                    dy={10}
                    tickFormatter={formatShortDate}
                  />
                  <YAxis
                    yAxisId="revenue"
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#6B7280', fontSize: 12}}
                    tickFormatter={(value) => `${(Number(value) || 0).toLocaleString()} ${t('sarCurrency')}`}
                    hide={!(breakdownMode === 'comparison' || breakdownMode === 'revenue')}
                    width={72}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{fill: '#6B7280', fontSize: 12}}
                    tickFormatter={(value) => (Number(value) || 0).toLocaleString()}
                    hide={!(breakdownMode === 'comparison' || breakdownMode === 'orders')}
                    width={48}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={((value: any, name: any) => {
                      if (name === 'orders') {
                        return [`${(Number(value) || 0).toLocaleString()} ${t('ordersLabel')}`, t('ordersLabel')];
                      }
                      return [`${(Number(value) || 0).toLocaleString()} ${t('sarCurrency')}`, t('revenueLabel')];
                    }) as any}
                  />
                  {(breakdownMode === 'comparison' || breakdownMode === 'revenue') && (
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      yAxisId="revenue"
                      stroke="#5B5FC7"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#5B5FC7', strokeWidth: 2, stroke: '#FFF' }}
                      activeDot={{ r: 7 }}
                    />
                  )}
                  {(breakdownMode === 'comparison' || breakdownMode === 'orders') && (
                    <Line
                      type="monotone"
                      dataKey="orders"
                      yAxisId="orders"
                      stroke="#FF6B35"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#FF6B35', strokeWidth: 2, stroke: '#FFF' }}
                      activeDot={{ r: 7 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 text-gray-500">
                <TrendingUp size={36} className="mb-3 opacity-40" />
                <p className="text-sm font-semibold">No monthly sales data for the selected range</p>
                <p className="text-xs text-gray-400 mt-1">Try changing date range or refresh after new orders</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[560px]">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-[#5B5FC7]">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{t('dashboardRevenueBreakdown')}</h3>
          </div>
          <div className="w-full flex flex-col animate-in fade-in duration-500">
            <div className="relative h-[330px] sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {breakdownTotal > 0 && (
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 18px rgba(0,0,0,0.12)' }}
                      formatter={((value: any) => {
                        const suffix = breakdownMode === 'orders' ? t('ordersLabel') : t('sarCurrency');
                        const label = breakdownMode === 'orders' ? t('ordersLabel') : t('revenueLabel');
                        return [`${(Number(value) || 0).toLocaleString()} ${suffix}`, label];
                      }) as any}
                    />
                  )}
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="72%"
                    innerRadius="44%"
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={3}
                    isAnimationActive
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {breakdownMode === 'orders' ? t('totalOrders') : t('totalRevenue')}
                </p>
                <p className="text-lg font-black text-gray-800 mt-1">
                  {(Number(breakdownTotal) || 0).toLocaleString()} {breakdownMode === 'orders' ? '' : t('sarCurrency')}
                </p>
              </div>
            </div>
            {hasMultipleBreakdownSlices && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {safeBreakdownData.map((item, index) => {
                  const share = breakdownTotal > 0 ? Math.round((item.value / breakdownTotal) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 bg-gray-50/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: donutColors[index % donutColors.length] }} />
                        <span className="text-xs font-semibold text-gray-700 truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{share}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 6. MONITORING LOG SECTION */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
              <ActivityIcon size={19} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-2xl leading-tight">{t('monitoringLog')}</h3>
              <p className="text-sm text-gray-500">{t('monitoringLogLiveAuditTrail')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActivityTimeWindow('all')}
              disabled={activityLoading}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activityTimeWindow === 'all'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-sky-500" />{t('monitoringLogLive')}</span>
            </button>
            <button
              onClick={() => setActivityTimeWindow('today')}
              disabled={activityLoading}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activityTimeWindow === 'today'
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t('monitoringLogToday')}
            </button>
            <button
              onClick={() => setActivityTimeWindow('7d')}
              disabled={activityLoading}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activityTimeWindow === '7d'
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t('monitoringLog7Days')}
            </button>
            <button
              onClick={exportActivityCsv}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] text-white text-sm font-semibold hover:bg-[#1E293B]"
            >
              <Download size={16} />
              {t('monitoringLogExport')}
            </button>
          </div>
        </div>
        {activityLoading && (
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-500">
            <RefreshCcw size={12} className="animate-spin" />
            {t('refreshBtn')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ActivityIcon size={18} />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">{activityStats.total}</p>
              <p className="text-sm text-gray-600 mt-1">{t('monitoringLogTotalEvents')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">{activityStats.pending}</p>
              <p className="text-sm text-gray-600 mt-1">{t('monitoringLogTypePending')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">{activityStats.success}</p>
              <p className="text-sm text-gray-600 mt-1">{t('monitoringLogTypeSuccess')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <BadgeAlert size={18} />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">{activityStats.failed}</p>
              <p className="text-sm text-gray-600 mt-1">{t('monitoringLogFailed')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h4 className="text-base font-bold text-gray-900">{t('monitoringLogRecentActivity')}</h4>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'all', label: t('monitoringLogFilterAll') },
                  { key: 'login', label: t('monitoringLogFilterLogin') },
                  { key: 'permissions', label: t('monitoringLogFilterPermissions') },
                  { key: 'exports', label: t('monitoringLogFilterExports') },
                  { key: 'failed', label: t('monitoringLogFailed') },
                ] as Array<{ key: ActivityViewFilter; label: string }>).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActivityViewFilter(item.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                      activityViewFilter === item.key
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative mt-3 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder={t('monitoringLogSearchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div className="hidden md:grid md:grid-cols-[1.6fr_0.9fr_1fr_0.9fr] px-4 py-2 text-[11px] uppercase tracking-widest text-gray-500 border-b border-gray-200 bg-gray-50">
            <span>{t('monitoringLogColumnAction')}</span>
            <span>{t('monitoringLogColumnStatus')}</span>
            <span>{t('monitoringLogColumnUser')}</span>
            <span>{t('monitoringLogColumnTime')}</span>
          </div>

          {filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => {
              const statusPill = activity.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : activity.type === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700';
              const statusDot = activity.type === 'success'
                ? 'bg-emerald-600'
                : activity.type === 'pending'
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

              return (
                <div key={activity.id} className="grid grid-cols-1 md:grid-cols-[1.6fr_0.9fr_1fr_0.9fr] gap-3 md:gap-2 items-start md:items-center px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${statusDot}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{activity.action}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.action.toLowerCase().includes('login') ? t('monitoringLogAuthEvent') : t('monitoringLogSystemEvent')}</p>
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-xl text-sm font-semibold ${statusPill}`}>
                      {activity.type === 'issue' ? t('monitoringLogFailed') : getActivityTypeLabel(activity.type)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800">{activity.user}</p>
                  <p className="text-gray-500 text-sm">
                    {new Date(activity.timestamp).toLocaleString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: '2-digit',
                    })}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-400">
              <RefreshCcw className="mx-auto mb-2 opacity-20" size={32} />
              <p>{t('monitoringLogNoFilteredResults')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatsCard({
  label,
  value,
  chip,
  icon: Icon,
  href,
  detailsLabel,
  gradientClass,
  chipClass,
}: {
  label: string,
  value: string,
  chip: string,
  icon: any,
  href: string,
  detailsLabel: string,
  gradientClass: string,
  chipClass: string,
}) {
  return (
    <Link href={href} className="block group">
      <div className={`rounded-2xl p-6 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br ${gradientClass}`}>
        <div className="flex justify-between items-start mb-6">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <Icon className="text-white" size={24} />
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${chipClass}`}>{chip}</span>
        </div>
        <p className="text-white/80 font-medium text-sm mb-2">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-2xl font-black text-white tracking-tight leading-tight break-words">{value}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-white/90 font-semibold">
            {detailsLabel}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="h-12 w-1/3 bg-gray-200 rounded-lg"></div>
      <div className="h-40 w-full bg-gray-100 rounded-2xl"></div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-[16px]"></div>)}
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="h-[450px] bg-gray-100 rounded-2xl"></div>
        <div className="h-[450px] bg-gray-100 rounded-2xl"></div>
      </div>
    </div>
  );
}
