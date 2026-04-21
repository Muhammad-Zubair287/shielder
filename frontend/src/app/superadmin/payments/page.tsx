'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  DollarSign, 
  Clock, 
  XCircle, 
  Plus, 
  RefreshCcw, 
  Eye,
  CreditCard,
  Banknote,
  Building2,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { paymentService, Payment } from '@/services/payment.service';
import { orderService } from '@/services/order.service';
import { format } from 'date-fns';
import Link from 'next/link';
import SARSymbol from '@/components/SARSymbol';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaymentsPage() {
  const { t, isRTL } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    pendingPayments: 0,
    failedPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    method: '',
    dateFrom: '',
    dateTo: ''
  });

  const [formData, setFormData] = useState({
    orderId: '',
    amount: '',
    method: 'CASH',
    transactionId: '',
    notes: ''
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      }).filter(([, value]) => value !== '' && value !== undefined && value !== null)
      );
      const response = await paymentService.getPayments(params);
      setPayments(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = async () => {
    try {
      const response = await paymentService.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [fetchPayments]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const fetchUnpaidOrders = async () => {
    try {
      setLoadingOrders(true);
      // Fetching orders that are not fully paid
      const response = await orderService.getOrders({ limit: 50, paymentStatus: 'PENDING' });
      setOrders(response.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await paymentService.recordPayment({
        orderId: formData.orderId,
        amount: parseFloat(formData.amount),
        method: formData.method,
        transactionId: formData.transactionId || undefined,
        notes: formData.notes || undefined
      });
      setShowRecordModal(false);
      setFormData({ orderId: '', amount: '', method: 'CASH', transactionId: '', notes: '' });
      fetchPayments();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'FAILED': return 'bg-red-100 text-red-700 border-red-200';
      case 'REFUNDED': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'PARTIALLY_REFUNDED': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <Banknote size={16} />;
      case 'BANK_TRANSFER': return <Building2 size={16} />;
      case 'CREDIT_CARD': 
      case 'DEBIT_CARD': return <CreditCard size={16} />;
      case 'ONLINE_GATEWAY': return <Plus size={16} />;
      case 'WALLET': return <Wallet size={16} />;
      default: return <DollarSign size={16} />;
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('paymentsTitle')}</h1>
          <p className="text-gray-500 text-sm font-medium">{t('paymentsSubtitle')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => { fetchPayments(); fetchStats(); }}
            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <RefreshCcw size={18} />
          </button>
          <button 
            onClick={() => { setShowRecordModal(true); fetchUnpaidOrders(); }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#FF6B35] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF6B35]/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>{t('addPayment')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title={t('totalSales')} 
          value={<span className="inline-flex items-center gap-0.5"><SARSymbol />{stats.totalRevenue.toLocaleString()}</span>} 
          icon={<SARSymbol size={24} className="brightness-0 invert" />} 
          color="bg-shielder-dark" 
          description="Total money made so far"
          onClick={() => setFilters(prev => ({ ...prev, status: 'PAID' }))}
        />
        <SummaryCard 
          title={t('todaysSales')} 
          value={<span className="inline-flex items-center gap-0.5"><SARSymbol />{stats.todayRevenue.toLocaleString()}</span>} 
          icon={<Plus size={24} />} 
          color="bg-shielder-secondary" 
          description="Money made today"
          onClick={() => setFilters(prev => ({ ...prev, status: 'PAID' }))}
        />
        <SummaryCard 
          title={t('unpaidLabel')} 
          value={stats.pendingPayments} 
          icon={<Clock size={24} />} 
          color="bg-orange-500" 
          description="Waiting for payment"
          onClick={() => setFilters(prev => ({ ...prev, status: 'PENDING' }))}
        />
        <SummaryCard 
          title={t('failedPaymentsLabel')} 
          value={stats.failedPayments} 
          icon={<XCircle size={24} />} 
          color="bg-red-500" 
          description="Failed payments"
          onClick={() => setFilters(prev => ({ ...prev, status: 'FAILED' }))}
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              name="search"
              placeholder={t('searchPayments')}
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
              <option value="PAID">{t('payPaid')}</option>
              <option value="PENDING">{t('pending')}</option>
              <option value="FAILED">{t('payFailed')}</option>
              <option value="REFUNDED">{t('payRefunded')}</option>
            </select>
            <select 
              name="method"
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium appearance-none"
              value={filters.method}
              onChange={handleFilterChange}
            >
              <option value="">{t('allMethods')}</option>
              <option value="CASH">{t('methodCash')}</option>
              <option value="BANK_TRANSFER">{t('methodBankTransfer')}</option>
              <option value="CREDIT_CARD">{t('methodCreditCard')}</option>
              <option value="ONLINE_GATEWAY">{t('methodOnlineGateway')}</option>
            </select>
            <input 
              type="date"
              name="dateFrom"
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
            <input 
              type="date"
              name="dateTo"
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('paymentInfoCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('orderAndCustomer')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('paymentMethod')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">{t('amountCol')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8 h-16 bg-gray-50/20"></td>
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">{t('noPaymentsFound')}</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-shielder-dark uppercase tracking-tight">#{payment.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{payment.transactionId || t('noTransactionId')}</span>
                        <span className="text-[10px] text-gray-500 font-medium mt-1">{format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link 
                          href={`/superadmin/orders/${payment.orderId}`}
                          className="text-xs font-bold text-shielder-primary hover:underline flex items-center"
                        >
                          {payment.order.orderNumber}
                        </Link>
                        <span className="text-sm font-medium text-gray-600 mt-0.5">{payment.order.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-400">
                          {getMethodIcon(payment.method)}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{payment.method.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-shielder-dark inline-flex items-center gap-0.5"><SARSymbol />{Number(payment.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/superadmin/payments/${payment.id}`}
                        className="p-2 text-gray-400 hover:text-shielder-primary hover:bg-shielder-primary/5 rounded-xl transition-all inline-block"
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

        <UnifiedPagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          isRTL={isRTL}
          labels={{
            showing: t('showing'),
            of: t('of'),
            results: t('records'),
            previous: t('previous'),
            next: t('next'),
          }}
          className="px-6"
        />
      </div>

      {showRecordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-shielder-dark/60 backdrop-blur-sm" onClick={() => setShowRecordModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-[#FF6B35] text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{t('addNewPayment')}</h2>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Enter payment details below</p>
              </div>
              <button onClick={() => setShowRecordModal(false)} className="text-white/50 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('chooseOrder')} *</label>
                  <select 
                    required
                    name="orderId"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium"
                    value={formData.orderId}
                    onChange={(e) => {
                      const selectedOrder = orders.find(o => o.id === e.target.value);
                      setFormData(prev => ({ 
                        ...prev, 
                        orderId: e.target.value,
                        amount: selectedOrder ? (Number(selectedOrder.total) - (selectedOrder.payments?.filter((p:any) => p.status === 'PAID').reduce((s:number, p:any) => s + Number(p.amount), 0) || 0)).toString() : ''
                      }));
                    }}
                  >
                    <option value="">{t('chooseAnOrder')}</option>
                    {orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.orderNumber} - {order.customerName} (SAR {Number(order.total).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  {loadingOrders && <p className="text-xs text-gray-400 mt-1 italic">{t('loadingOrdersList')}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('amountCol')} *</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-bold"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('paymentMethod')} *</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium"
                      value={formData.method}
                      onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="CASH">{t('methodCash')}</option>
                      <option value="BANK_TRANSFER">{t('methodBankTransfer')}</option>
                      <option value="CREDIT_CARD">{t('methodCreditCard')}</option>
                      <option value="DEBIT_CARD">{t('methodDebitCard')}</option>
                      <option value="ONLINE_GATEWAY">{t('methodOnlineGateway')}</option>
                      <option value="WALLET">{t('methodWallet')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('transactionIdOptional')}</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-mono"
                    placeholder="tx_xxxxxxxxxxxx"
                    value={formData.transactionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">{t('paymentNotes')}</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-shielder-primary/20 focus:outline-none text-sm font-medium"
                    placeholder="Reference notes for this payment..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  ></textarea>
                </div>
              </div>

              <div className="pt-4 flex space-x-4">
                <button 
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1 px-6 py-4 border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 bg-[#FF6B35] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-[#FF6B35]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{t('confirmPayment')}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, icon, color, description, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-shielder-primary/30 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-shielder-dark mt-1 tracking-tighter">{value}</h3>
          <p className="text-[10px] text-gray-400 italic font-medium mt-1 leading-tight">{description}</p>
        </div>
        <div className={`p-3 ${color} text-white rounded-2xl shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
