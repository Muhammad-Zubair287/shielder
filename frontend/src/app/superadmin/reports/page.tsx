'use client';

import React, { useEffect, useMemo, useState, ReactNode } from 'react';
import FixedSARMark from '@/components/FixedSARMark';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Banknote,
  Download,
  Filter,
  ArrowUpRight,
  PieChart as PieChartIcon,
  RefreshCcw,
  FileText,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import adminService from '@/services/admin.service';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const COLORS = ['#1a1a1a', '#eab308', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'];

export default function ReportsDashboard() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [dateRange, setDateRange] = useState('30D');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({
    categoryId: '',
    paymentStatus: '',
    orderStatus: ''
  });
  const [salesTablePage, setSalesTablePage] = useState(1);
  const [ordersTablePage, setOrdersTablePage] = useState(1);

  const REPORT_TABLE_PAGE_SIZE = 10;

  const getDateBounds = () => {
    let fromDate = subDays(new Date(), 30);
    let toDate = new Date();

    if (dateRange === '7D') fromDate = subDays(new Date(), 7);
    if (dateRange === 'TODAY') fromDate = startOfDay(new Date());
    if (dateRange === 'CUSTOM' && customRange.from && customRange.to) {
      fromDate = new Date(customRange.from);
      toDate = new Date(customRange.to);
    }

    return { fromDate, toDate };
  };

  const categoriesQuery = useQuery({
    queryKey: ['superadmin-reports-categories'],
    queryFn: async () => {
      const res = await adminService.getCategories();
      return res?.data?.data || [];
    },
    staleTime: 30 * 60 * 1000,
  });

  const reportParams = useMemo(() => {
    const { fromDate, toDate } = getDateBounds();
    const params: {
      from: string;
      to: string;
      categoryId?: string;
      paymentStatus?: string;
      orderStatus?: string;
    } = {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    };

    if (activeTab === 'SALES') {
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.orderStatus) params.orderStatus = filters.orderStatus;
    }

    return params;
  }, [activeTab, dateRange, customRange.from, customRange.to, filters.categoryId, filters.paymentStatus, filters.orderStatus]);

  const reportQuery = useQuery({
    queryKey: ['superadmin-reports-data', activeTab, reportParams],
    queryFn: async () => {
      let res;
      if (activeTab === 'OVERVIEW') res = await adminService.getReportsOverview(reportParams);
      else if (activeTab === 'SALES') res = await adminService.getSalesReport(reportParams);
      else if (activeTab === 'ORDERS') res = await adminService.getOrderReport(reportParams);
      else if (activeTab === 'INVENTORY') res = await adminService.getInventoryReport();
      else if (activeTab === 'PAYMENTS') res = await adminService.getPaymentReport(reportParams);
      else res = await adminService.getProfitLossReport(reportParams);
      return res?.data?.data;
    },
    enabled: dateRange !== 'CUSTOM' || Boolean(customRange.from && customRange.to),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const categories = categoriesQuery.data || [];
  const data = reportQuery.data ?? null;
  const loading = reportQuery.isLoading;

  useEffect(() => {
    setSalesTablePage(1);
    setOrdersTablePage(1);
  }, [activeTab, dateRange, filters.categoryId, filters.paymentStatus, filters.orderStatus, customRange.from, customRange.to]);

  const handleExport = async (formatSelection: string) => {
    try {
      const format = formatSelection.toLowerCase();
      toast.loading(`Preparing ${formatSelection} report...`, { id: 'export' });
      
      let fromDate = subDays(new Date(), 30);
      let toDate = new Date();

      if (dateRange === '7D') fromDate = subDays(new Date(), 7);
      if (dateRange === 'TODAY') fromDate = startOfDay(new Date());
      if (dateRange === 'CUSTOM' && customRange.from && customRange.to) {
        fromDate = new Date(customRange.from);
        toDate = new Date(customRange.to);
      }

      const params: { from: string, to: string, format: string, categoryId?: string, paymentStatus?: string, orderStatus?: string } = { 
        from: fromDate.toISOString(), 
        to: toDate.toISOString(),
        format: formatSelection.toLowerCase() === 'excel' ? 'excel' : formatSelection.toLowerCase()
      };

      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.orderStatus) params.orderStatus = filters.orderStatus;

      const response = await adminService.downloadSalesReport(params);
      
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
              'text/csv' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales-report-${new Date().getTime()}.${format === 'excel' ? 'xlsx' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      await adminService.logReportExport({ reportType: activeTab, format: formatSelection });
      toast.success(`${formatSelection} exported successfully!`, { id: 'export' });
    } catch (err) {
      toast.error('Export failed', { id: 'export' });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50/90 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-[#0C1B33]/8 via-transparent to-transparent" />
      <div className="mx-auto max-w-7xl space-y-5 px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[2.25rem] border border-white/60 bg-white/85 p-5 md:p-6 shadow-[0_20px_60px_rgba(12,27,51,0.08)] backdrop-blur">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-shielder-primary/70">Enterprise analytics</p>
          <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('enterpriseReportsTitle')}</h1>
          <p className="text-gray-500 text-sm font-medium">{t('enterpriseReportsSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl bg-slate-100 p-1 shadow-inner">
            {['TODAY', '7D', '30D', 'CUSTOM'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  dateRange === range ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {dateRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
              <input
                type="date"
                value={customRange.from}
                onChange={(e) => setCustomRange(prev => ({ ...prev, from: e.target.value }))}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-2 py-1 focus:outline-none"
              />
              <span className="text-gray-300 text-[10px] font-black">TO</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange(prev => ({ ...prev, to: e.target.value }))}
                className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-2 py-1 focus:outline-none"
              />
              <button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['superadmin-reports-data'] });
                }}
                className="bg-shielder-dark text-white p-1.5 rounded-lg hover:bg-black transition-colors"
                title="Apply Custom Range"
              >
                <RefreshCcw size={12} className={reportQuery.isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <select 
              onChange={(e) => handleExport(e.target.value)}
              className="px-4 py-2.5 bg-shielder-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/10 focus:outline-none appearance-none cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Export As...</option>
              <option value="PDF">PDF Document</option>
              <option value="EXCEL">Excel Spreadsheet</option>
              <option value="CSV">CSV Data File</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: BarChart3 },
          { id: 'SALES', label: 'Sales', icon: TrendingUp },
          { id: 'ORDERS', label: 'Orders', icon: ShoppingCart },
          { id: 'INVENTORY', label: 'Inventory', icon: Package },
          { id: 'PAYMENTS', label: 'Payments', icon: Banknote },
          { id: 'PROFIT', label: 'P&L', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
              activeTab === tab.id 
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-[#FF6B35]/20' 
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Advanced Filters (Only for Sales) */}
      {activeTab === 'SALES' && (
        <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters:</span>
          </div>
          
          <select 
            value={filters.categoryId}
            onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value }))}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                {cat.translations?.[0]?.name || cat.name || 'Category'}
              </option>
            ))}
          </select>

          <select 
            value={filters.paymentStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer"
          >
            <option value="">All Payment Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PARTIAL">Partial</option>
          </select>

          <select 
            value={filters.orderStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, orderStatus: e.target.value }))}
            className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer"
          >
            <option value="">All Order Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button 
            onClick={() => setFilters({ categoryId: '', paymentStatus: '', orderStatus: '' })}
            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}

      {loading ? (
        <ReportSkeleton />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {activeTab === 'OVERVIEW' && <OverviewTab data={data} />}
          {activeTab === 'SALES' && (
            <SalesTab
              data={data}
              page={salesTablePage}
              pageSize={REPORT_TABLE_PAGE_SIZE}
              onPageChange={setSalesTablePage}
              isRTL={isRTL}
            />
          )}
          {activeTab === 'ORDERS' && (
            <OrdersTab
              data={data}
              page={ordersTablePage}
              pageSize={REPORT_TABLE_PAGE_SIZE}
              onPageChange={setOrdersTablePage}
              isRTL={isRTL}
            />
          )}
          {activeTab === 'INVENTORY' && <InventoryTab data={data} />}
          {activeTab === 'PAYMENTS' && <PaymentsTab data={data} />}
          {activeTab === 'PROFIT' && <ProfitLossTab data={data} />}
        </div>
      )}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: Record<string, any> | null }) {
  if (!data || !data.summary) {
    return <NoDataState title="Overview" />;
  }
  const { summary } = data;

  const RiyalMark = ({ size = 16, className = '' }: { size?: number; className?: string }) => (
    <FixedSARMark size={size} className={className} />
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Sales" value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.totalSales || 0).toLocaleString()}</span>} subtitle="Net processed payments" icon={<BarChart3 size={18} />} color="bg-shielder-dark" />
        <SummaryCard title="Total Orders" value={summary.orderCount || 0} subtitle="New orders in period" icon={<ShoppingCart size={18} />} color="bg-shielder-secondary" />
        <SummaryCard title="Total Revenue" value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.totalRevenue || 0).toLocaleString()}</span>} subtitle="Gross business intake" icon={<TrendingUp size={18} />} color="bg-emerald-500" />
        <SummaryCard title="Total Refunds" value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.totalRefunds || 0).toLocaleString()}</span>} subtitle="Money returned to clients" icon={<RefreshCcw size={18} />} color="bg-red-500" />
        <SummaryCard title="Net Profit" value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.netProfit || 0).toLocaleString()}</span>} subtitle="Revenue - (Refunds + Expenses)" icon={<FileText size={18} />} color="bg-purple-500" />
        <SummaryCard title="Low Stock Products" value={summary.lowStockProducts || 0} subtitle="Items requiring restock" icon={<Package size={18} />} color="bg-orange-500" />
      </div>

      {data.salesTrend && data.salesTrend.length > 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Executive Sales Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val ? format(new Date(val), 'MMM dd') : ''}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => val ? format(new Date(val), 'MMMM dd, yyyy') : ''}
                />
                <Line type="monotone" dataKey="amount" stroke="#eab308" strokeWidth={4} dot={{ r: 4, fill: '#eab308' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Sales Trend Available</p>
        </div>
      )}
    </div>
  );
}

function SalesTab({ data, page, pageSize, onPageChange, isRTL }: any) {
  if (!data) {
    return <NoDataState title="Sales" />;
  }

  const { summary = {}, salesByDate = [], salesByCategory = [], salesByProduct = [], topSellingProducts = [] } = data;
  const salesTotalPages = Math.max(1, Math.ceil(salesByProduct.length / pageSize));
  const pagedSalesByProduct = salesByProduct.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Filtered Revenue" 
          value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.totalRevenue || 0).toLocaleString()}</span>} 
          subtitle="Total for selected filters" 
          icon={<Banknote size={18} />} 
          color="bg-shielder-dark" 
        />
        <SummaryCard 
          title="Units Sold" 
          value={(summary.totalUnitsSold || 0).toLocaleString()} 
          subtitle="Volume in period" 
          icon={<Package size={18} />} 
          color="bg-amber-500" 
        />
        <SummaryCard 
          title="Distinct Products" 
          value={summary.productCount || 0} 
          subtitle="Unique SKUs moved" 
          icon={<ShoppingCart size={18} />} 
          color="bg-blue-500" 
        />
        <SummaryCard 
          title="Avg value/day" 
          value={<span className="inline-flex items-center gap-1"><FixedSARMark />{(summary.averageOrderValue || 0).toLocaleString()}</span>} 
          subtitle="Based on selected range" 
          icon={<TrendingUp size={18} />} 
          color="bg-emerald-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative min-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Sales by Date (SAR)</h3>
          {salesByDate.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByDate}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => val ? format(new Date(val), 'MMM dd') : ''}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(val) => val ? format(new Date(val), 'MMMM dd, yyyy') : ''}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#1a1a1a" strokeWidth={4} dot={{ r: 4, fill: '#1a1a1a' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <BarChart3 size={40} className="mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No matching sales trend</p>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative min-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Sales by Category</h3>
          {salesByCategory.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                    nameKey="name"
                  >
                    {salesByCategory.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <PieChartIcon size={40} className="mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No category data</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Top 10 Best-Selling Products (Units Sold)</h3>
          {topSellingProducts.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellingProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f1" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={190}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#0A1E36' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sales" fill="#eab308" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[350px] text-gray-400">
               <Package size={40} className="mb-2 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">No product sales yet</p>
            </div>
          )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Detailed Product Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Items Sold</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedSalesByProduct.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-4 font-bold text-sm text-shielder-dark">{product.name}</td>
                  <td className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{product.categoryName}</td>
                  <td className="px-8 py-4 text-center text-sm font-medium text-gray-600">{product.quantitySold}</td>
                  <td className="px-8 py-4 text-right text-sm font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><FixedSARMark />{(product.totalRevenue || 0).toLocaleString()}</span></td>
                </tr>
              ))}
              {salesByProduct.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No performance data available for current filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {salesByProduct.length > 0 && (
          <UnifiedPagination
            page={page}
            totalPages={salesTotalPages}
            totalItems={salesByProduct.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            isRTL={isRTL}
          />
        )}
      </div>
    </div>
  );
}

function NoDataState({ title }: { title: string }) {
  return (
    <div className="bg-white p-20 rounded-[3rem] border border-gray-100 shadow-sm text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
        <FileText size={40} />
      </div>
      <h3 className="text-xl font-black text-shielder-dark uppercase tracking-tight">No {title} Data Found</h3>
      <p className="text-gray-400 text-sm font-medium mt-2">Try adjusting your date range or filters.</p>
    </div>
  );
}

function OrdersTab({ data, page, pageSize, onPageChange, isRTL }: any) {
  if (!data || !data.stats) {
    return <NoDataState title="Orders" />;
  }
  const stats = data.stats || {};
  const total = Object.values(stats || {}).reduce((acc: number, curr: any) => acc + (Number(curr) || 0), 0);
  const recentLargeOrders = data.recentLargeOrders || [];
  const ordersTotalPages = Math.max(1, Math.ceil(recentLargeOrders.length / pageSize));
  const pagedRecentLargeOrders = recentLargeOrders.slice((page - 1) * pageSize, page * pageSize);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OrderStats title="Total Orders" value={total} color="text-shielder-dark" />
        <OrderStats title="Completed" value={stats.DELIVERED || 0} color="text-emerald-500" />
        <OrderStats title="Cancelled" value={stats.CANCELLED || 0} color="text-red-500" />
        <OrderStats title="Pending" value={stats.PENDING || 0} color="text-orange-500" />
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Order Volume Trend</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => val ? format(new Date(val), 'MMM dd') : ''}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <Tooltip 
                 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 labelFormatter={(val) => val ? format(new Date(val), 'MMMM dd, yyyy') : ''}
              />
              <Bar dataKey="count" fill="#eab308" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Recent High-Value Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Date</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedRecentLargeOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-4 font-bold text-sm text-shielder-dark">#{order.orderNumber}</td>
                  <td className="px-8 py-4 text-sm font-medium text-gray-600">{order.customerName}</td>
                  <td className="px-8 py-4 text-center text-sm font-medium text-gray-500">{order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}</td>
                  <td className="px-8 py-4 text-right text-sm font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><FixedSARMark />{(order.totalAmount || 0).toLocaleString()}</span></td>
                </tr>
              ))}
              {recentLargeOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No High-Value Orders Found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {recentLargeOrders.length > 0 && (
          <UnifiedPagination
            page={page}
            totalPages={ordersTotalPages}
            totalItems={recentLargeOrders.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            isRTL={isRTL}
          />
        )}
      </div>
    </div>
  );
}

function InventoryTab({ data }: any) {
  if (!data || data.currentStockTotal === undefined) {
    return <NoDataState title="Inventory" />;
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Corporate Stock</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-4xl font-black text-shielder-dark leading-none">{(data.currentStockTotal || 0).toLocaleString()}</h2>
            <div className="p-2 bg-shielder-dark text-white rounded-xl"><Package size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Total pieces across all categories</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Critical Stock Alerts</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className={`text-4xl font-black leading-none ${(data.lowStockCount || 0) > 5 ? 'text-red-500' : 'text-orange-500'}`}>{data.lowStockCount || 0}</h2>
            <div className={`p-2 rounded-xl text-white ${(data.lowStockCount || 0) > 5 ? 'bg-red-500' : 'bg-orange-500'}`}><AlertTriangle size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Items below inventory threshold</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Liquidated (OOS)</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-4xl font-black text-gray-400 leading-none">{data.outOfStockCount || 0}</h2>
            <div className="p-2 bg-gray-100 text-gray-400 rounded-xl"><ChevronRight size={20} /></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Products with zero inventory</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/20">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Industrial Stock Movement History</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {(data.recentMovement || []).map((log: any) => (
            <div key={log.id} className="p-4 px-8 flex items-center justify-between hover:bg-gray-50/50 transition-all">
              <div className="flex items-center space-x-4">
                <div className={`w-2 h-10 rounded-full ${log.quantity > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                   <p className="text-xs font-black text-shielder-dark uppercase tracking-tight">{log.product_name || log.product?.translations?.[0]?.name}</p>
                   <p className="text-[10px] text-gray-400 font-bold">{format(new Date(log.created_at || log.createdAt || new Date()), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${log.quantity > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {log.quantity > 0 ? '+' : ''}{log.quantity} UNITS
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-black">{(log.type || '').replace('_', ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ data }: any) {
  if (!data || !data.stats) {
    return <NoDataState title="Payments" />;
  }
  const stats = data.stats || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Revenue Stream Trend</h3>
           <div className="h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={data.revenueTrend || []}>
                  <XAxis dataKey="date" hide />
                  <Tooltip labelFormatter={(v) => v ? format(new Date(v), 'PPP') : ''} />
                  <Bar dataKey="amount" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PaymentStatCard label="Total Paid" value={stats.PAID?.amount || 0} count={stats.PAID?.count || 0} color="emerald" />
          <PaymentStatCard label="Pending" value={stats.PENDING?.amount || 0} count={stats.PENDING?.count || 0} color="orange" />
          <PaymentStatCard label="Refunded" value={stats.REFUNDED?.amount || 0} count={stats.REFUNDED?.count || 0} color="red" />
          <PaymentStatCard label="Failed" value={stats.FAILED?.amount || 0} count={stats.FAILED?.count || 0} color="gray" />
        </div>
      </div>
    </div>
  );
}

function ProfitLossTab({ data }: any) {
  if (!data) {
    return <NoDataState title="Profit & Loss" />;
  }
  const totalSales = data.totalSales || 0;
  const totalRefunds = data.totalRefunds || 0;
  const totalExpenses = data.totalExpenses || 0;
  const netProfit = data.netProfit !== undefined ? data.netProfit : (totalSales - totalRefunds - totalExpenses);
  const margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-shielder-dark text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-shielder-secondary/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50 mb-4">Enterprise P&L Statement</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-2">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter"><span className="inline-flex items-center gap-2"><FixedSARMark size={48} />{netProfit.toLocaleString()}</span></h2>
              <p className="text-shielder-secondary font-black text-xs md:text-sm uppercase tracking-widest flex items-center">
                Net Industrial Profit
                <ArrowUpRight size={16} className="ml-1" />
              </p>
           </div>
           <div className="text-right">
              <p className="text-4xl font-black">{margin.toFixed(1)}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Profit Margin</p>
           </div>
        </div>
          <button 
          onClick={() => {
            toast.success('Generating P&L Statement...');
          }}
           className="mt-7 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all inline-flex items-center space-x-2"
        >
          <Download size={14} />
          <span>Download Statement</span>
        </button>
      </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-7">
          <div className="flex justify-between items-center pb-7 border-b border-gray-50">
            <div className="space-y-1.5">
              <p className="text-2xl font-black text-shielder-dark leading-none"><span className="inline-flex items-center gap-1"><FixedSARMark />{totalSales.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Sales (Paid)</p>
           </div>
           <ChevronRight className="text-gray-200" />
            <div className="space-y-1.5 text-right">
              <p className="text-2xl font-black text-red-500 leading-none">-<span className="inline-flex items-center gap-1"><FixedSARMark />{totalRefunds.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Refunds</p>
           </div>
        </div>
          <div className="flex justify-between items-center pb-7 border-b border-gray-50">
            <div className="space-y-1.5">
              <p className="text-2xl font-black text-emerald-500 leading-none"><span className="inline-flex items-center gap-1"><FixedSARMark />{(totalSales - totalRefunds).toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Profit</p>
           </div>
           <ChevronRight className="text-gray-200" />
            <div className="space-y-1.5 text-right">
              <p className="text-2xl font-black text-orange-500 leading-none">-<span className="inline-flex items-center gap-1"><FixedSARMark />{totalExpenses.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operating Expenses</p>
           </div>
        </div>
          <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-6 py-5">
           <p className="text-xs font-black uppercase tracking-widest text-shielder-dark">Net Operating Income</p>
            <p className="text-2xl font-black text-shielder-dark"><span className="inline-flex items-center gap-1"><FixedSARMark />{netProfit.toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  );
}

// Helper Components
interface SummaryCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

function SummaryCard({ title, value, subtitle, icon, color }: SummaryCardProps) {
  return (
    <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:border-shielder-primary/20 transition-all group min-h-[220px] flex flex-col justify-between">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white shadow-md mb-5 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-shielder-dark tracking-tighter leading-none">{value}</h3>
      </div>
      <div className="w-12 h-1 bg-gray-50 my-4" />
      <p className="text-[10px] font-bold text-gray-400 italic lowercase">{subtitle}</p>
    </div>
  );
}

interface OrderStatsProps {
  title: string;
  value: string | number;
  color: string;
}

function OrderStats({ title, value, color }: OrderStatsProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center space-y-1.5">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

interface PaymentStatCardProps {
  label: string;
  value: number;
  count: number;
  color: 'emerald' | 'orange' | 'red' | 'gray';
}

function PaymentStatCard({ label, value, count, color }: PaymentStatCardProps) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  };
  return (
     <div className={`${colors[color]} p-5 rounded-3xl space-y-2 shadow-sm`}>
       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <h4 className="text-xl font-black tracking-tight"><span className="inline-flex items-center gap-1"><FixedSARMark />{value.toLocaleString()}</span></h4>
       <p className="text-[10px] font-bold opacity-60 uppercase">{count} TRANSACTIONS</p>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-48 bg-gray-100 rounded-3xl" />
      ))}
    </div>
  );
}
