'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCcw, 
  TrendingUp, 
  Package, 
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { orderService } from '@/services/order.service';
import Link from 'next/link';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrdersPage() {
  const { t, isRTL } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      const response = await orderService.getOrders(params);
      setOrders(response.orders);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchSummary = async () => {
    try {
      const response = await orderService.getOrderSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch order summary:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchSummary();
  }, [fetchOrders]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const statusColors: any = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
    PROCESSING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    SHIPPED: 'bg-purple-100 text-purple-800 border-purple-200',
    DELIVERED: 'bg-green-100 text-green-800 border-green-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('ordersTitle')}</h1>
          <p className="text-gray-500 text-sm font-medium">{t('ordersSubtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { fetchOrders(); fetchSummary(); }}
            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title={t('totalOrders')} 
          value={summary.totalOrders} 
          icon={<TrendingUp size={24} />} 
          color="bg-shielder-dark" 
          description="Cumulative system volume"
        />
        <SummaryCard 
          title={t('pendingOrders')} 
          value={summary.pendingOrders} 
          icon={<Clock size={24} />} 
          color="bg-shielder-secondary" 
          description="Awaiting processing"
        />
        <SummaryCard 
          title={t('completedOrders')} 
          value={summary.completedOrders} 
          icon={<CheckCircle2 size={24} />} 
          color="bg-green-500" 
          description="Successfully fulfilled"
        />
        <SummaryCard 
          title={t('cancelledOrders')} 
          value={summary.cancelledOrders} 
          icon={<XCircle size={24} />} 
          color="bg-red-500" 
          description="Voided transactions"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              name="search"
              placeholder={t('searchOrders')}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium transition-all"
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <select 
              name="status"
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium appearance-none"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">{t('allStatuses')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="PROCESSING">{t('processing')}</option>
              <option value="SHIPPED">{t('shipped')}</option>
              <option value="DELIVERED">{t('delivered')}</option>
              <option value="CANCELLED">{t('cancelled')}</option>
            </select>
            <select 
              name="paymentStatus"
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium appearance-none"
              value={filters.paymentStatus}
              onChange={handleFilterChange}
            >
              <option value="">{t('allPaymentStatuses')}</option>
              <option value="PAID">{t('payPaid')}</option>
              <option value="UNPAID">{t('payUnpaid')}</option>
              <option value="REFUNDED">{t('payRefunded')}</option>
            </select>
            <input 
              type="date"
              name="dateFrom"
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
            <input 
              type="date"
              name="dateTo"
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('orderID')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('customer')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('productsLabel')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('orderTotal')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('paymentStatus')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('orderStatus')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <TableSkeleton key={i} />)
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">
                    {t('noOrdersFound')}
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-shielder-dark tracking-tighter">#{order.orderNumber}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-shielder-dark text-xs font-black">
                          {order.customerName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{order.customerName || 'Guest User'}</span>
                          <span className="text-[10px] text-gray-500">{order.user?.email || 'No email'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Package size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-600">{order._count?.items || 0} Products</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-shielder-dark">
                      ${Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${
                        order.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 
                        order.paymentStatus === 'REFUNDED' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/superadmin/orders/${order.id}`}
                        className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-all inline-flex items-center"
                      >
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {t('page')} {pagination.page} {t('of')} {pagination.pages}
          </span>
          <div className="flex items-center space-x-2">
            <button 
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, description }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-shielder-primary/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} text-white rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic tracking-tighter">System Data</span>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-black text-shielder-dark tracking-tighter">{(value || 0).toLocaleString()}</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{title}</span>
        <p className="text-[10px] text-gray-400 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <tr className="animate-pulse">
      <td colSpan={7} className="px-6 py-4">
        <div className="h-10 bg-gray-50 rounded-lg w-full"></div>
      </td>
    </tr>
  );
}

