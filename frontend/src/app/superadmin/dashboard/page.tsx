'use client';

import React, { useEffect, useState } from 'react';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  Layers,
  Activity as ActivityIcon,
  BadgeAlert,
  Clock
} from 'lucide-react';
import adminService from '@/services/admin.service';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Recharts is ~500 KB parsed — lazy-load it so it doesn't block the initial
// dashboard paint. The charts appear after the stats cards are already visible.
const BarChart = dynamic(() => import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => ({ default: m.Bar })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => ({ default: m.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => ({ default: m.Tooltip })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => ({ default: m.Line })), { ssr: false });

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

export default function SuperAdminDashboard() {
  const { t, isRTL } = useLanguage();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [analytics, setAnalytics] = useState<MonthlyAnalytic[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, lowStockRes, analyticsRes, activityRes] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getLowStockProducts(),
        adminService.getMonthlyAnalytics(),
        adminService.getActivity()
      ]);

      setSummary(summaryRes.data.data);
      setLowStock(lowStockRes.data.products || []);
      setAnalytics(analyticsRes.data.data);
      setActivities(activityRes.data.data);
    } catch (err: any) {
      setError(t('fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
                        <span className="px-2 py-1 bg-red-100 text-red-500 text-[10px] font-black rounded uppercase">CRITICAL</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded uppercase">LOW</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{t('supplierLabel')}: <span className="text-gray-700 font-medium">{product.brand?.name || 'N/A'}</span></p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard 
          label={t('totalProducts')} 
          value={(summary?.totalProducts ?? 0).toLocaleString()} 
          icon={Package}
          bgColor="#5B5FC7"
        />
        <StatsCard 
          label={t('totalStock')} 
          value={(summary?.totalStock ?? 0).toLocaleString()} 
          icon={Layers}
          bgColor="#374151"
        />
        <StatsCard 
          label={t('inventoryValue')} 
          value={`${(summary?.inventoryValue ?? 0).toLocaleString()} ${t('sarCurrency')}`} 
          icon={TrendingUp}
          bgColor="#FF6B35"
        />
        <StatsCard 
          label={t('totalRevenue')} 
          value={`${(summary?.totalRevenue ?? 0).toLocaleString()} ${t('sarCurrency')}`} 
          icon={ShoppingCart}
          bgColor="#5B5FC7"
        />
        <StatsCard 
          label={t('totalCategories')} 
          value={(summary?.totalCategories ?? 0).toLocaleString()} 
          icon={ActivityIcon}
          bgColor="#374151"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 5. ANALYTICS SECTION */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-[#5B5FC7]">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{t('salesGraph')}</h3>
          </div>
          <div className="w-full h-[320px] min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={((value: any) => [`${(Number(value) || 0).toLocaleString()} ${t('sarCurrency')}`, t('revenueLabel')]) as any}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#5B5FC7" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#5B5FC7', strokeWidth: 2, stroke: '#FFF' }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#FF6B35" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#FF6B35', strokeWidth: 2, stroke: '#FFF' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-blue-50 p-2 rounded-lg text-[#5B5FC7]">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">{t('orderTrend')}</h3>
          </div>
          <div className="w-full h-[320px] min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="orders" fill="#5B5FC7" radius={[8, 8, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 6. RECENT ACTIVITY SECTION */}
      <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-gray-50 p-2 rounded-lg text-gray-700">
            <ActivityIcon size={20} />
          </div>
          <h3 className="font-bold text-gray-800 text-lg">{t('monitoringLog')}</h3>
        </div>
        
        <div className="space-y-4">
          {activities.length > 0 ? activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'success' ? 'bg-[#16A34A]' : 
                  activity.type === 'pending' ? 'bg-[#FACC15]' : 
                  'bg-[#DC2626]'
                }`} />
                <div>
                  <p className="font-bold text-gray-800">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.user}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                <Clock size={14} />
                {new Date(activity.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-400">
              <RefreshCcw className="mx-auto mb-2 opacity-20" size={32} />
              <p>{t('noRecentActivity')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, bgColor }: { label: string, value: string, icon: any, bgColor: string }) {
  return (
    <div className="rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group cursor-default shadow-sm" style={{ backgroundColor: bgColor }}>
      <div className="flex justify-between items-start mb-6">
        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <p className="text-white/80 font-medium text-sm mb-2">{label}</p>
      <h3 className="text-2xl font-black text-white tracking-tight leading-tight break-words">{value}</h3>
    </div>
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
