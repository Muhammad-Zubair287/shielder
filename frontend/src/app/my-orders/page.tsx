'use client';

/**
 * /my-orders  –  Customer Order History Page
 *
 * Shows all orders placed by the authenticated customer.
 * Links to /order-confirmation/[id] for each order detail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCcw,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { orderService } from '@/services/order.service';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  _count?: { orderItems: number };
  orderItems?: Array<unknown>;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'CONFIRMED' || s === 'DELIVERED') return 'bg-green-100 text-green-700';
  if (s === 'CANCELLED')                      return 'bg-red-100 text-red-700';
  if (s === 'PROCESSING' || s === 'SHIPPED')  return 'bg-blue-100 text-blue-700';
  return 'bg-orange-100 text-orange-700';
}

function paymentStatusColor(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'PAID')     return 'bg-green-100 text-green-700';
  if (s === 'FAILED')   return 'bg-red-100 text-red-700';
  if (s === 'REFUNDED') return 'bg-purple-100 text-purple-700';
  return 'bg-yellow-100 text-yellow-700';
}

function methodIcon(method: string) {
  const m = (method || '').toUpperCase();
  if (m === 'CREDIT_CARD')   return <CreditCard  size={13} />;
  if (m === 'BANK_TRANSFER') return <Building2   size={13} />;
  return <Banknote size={13} />;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyOrdersPage() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // ── Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const [orders,     setOrders]     = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (page = 1) => {
    setRefreshing(true);
    try {
      const res = await orderService.getMyOrders({ page, limit: pagination.limit });
      setOrders(res.orders ?? []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err: any) {
      if (err?.response?.status !== 401) toast.error(t('myOrders.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.limit, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchOrders(1);
  }, [authLoading, isAuthenticated, fetchOrders]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#F97316]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="flex items-center mb-8 relative">
            <Link
              href="/products"
              className={`p-2 text-gray-600 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors ${isRTL ? 'ml-auto' : 'mr-auto'}`}
              aria-label="back"
            >
              <BackArrow size={22} />
            </Link>
            <h1 className="absolute inset-x-0 text-center text-xl font-bold text-gray-900 pointer-events-none">
              {t('myOrders.title')}
            </h1>
            <button
              onClick={() => fetchOrders(pagination.page)}
              disabled={refreshing}
              className={`ml-auto text-gray-400 hover:text-[#F97316] transition-colors disabled:opacity-40 ${isRTL ? 'mr-auto ml-0' : ''}`}
              aria-label="refresh"
            >
              <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Empty state */}
          {orders.length === 0 && !refreshing ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
                <ShoppingBag size={36} className="text-[#F97316]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{t('myOrders.empty')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('myOrders.emptySubtitle')}</p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#e8650a] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-colors shadow-sm"
              >
                {t('myOrders.goToProducts')}
              </Link>
            </div>
          ) : (
            <>
              {/* Orders list */}
              <div className="space-y-4">
                {orders.map(order => {
                  const itemCount = order._count?.orderItems ?? order.orderItems?.length ?? 0;
                  let dateStr = '';
                  try { dateStr = format(new Date(order.createdAt), 'dd MMM yyyy'); } catch { dateStr = order.createdAt?.slice(0, 10) ?? ''; }

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-orange-200 transition-colors"
                    >
                      {/* Top row */}
                      <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <p className="text-xs text-gray-500">{t('myOrders.orderNumber')}</p>
                          <p className="text-sm font-bold text-gray-900 tracking-wide">#{order.orderNumber}</p>
                        </div>
                        <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                            <Clock size={10} />
                            {t(`orderConfirmation.status.${order.status?.toLowerCase()}`) || order.status}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${paymentStatusColor(order.paymentStatus)}`}>
                            {methodIcon(order.paymentMethod)}
                            {t(`orderConfirmation.paymentStatus.${order.paymentStatus?.toLowerCase()}`) || order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className={`flex items-center justify-between px-5 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="flex items-center gap-1">
                            <Package size={14} />
                            {itemCount} {t('myOrders.items')}
                          </span>
                          <span>{dateStr}</span>
                        </div>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="font-bold text-[#0D1637] text-sm flex items-center gap-0.5">
                            <SARSymbol />{Number(order.total).toFixed(2)}
                          </span>
                          <Link
                            href={`/order-confirmation/${order.id}`}
                            className="inline-flex items-center gap-1 text-[#F97316] hover:text-[#e8650a] text-sm font-semibold transition-colors"
                          >
                            {t('myOrders.viewDetails')}
                            <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className={`flex items-center justify-center gap-3 mt-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => fetchOrders(pagination.page - 1)}
                    disabled={pagination.page <= 1 || refreshing}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-40 transition-colors"
                  >
                    {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                  </button>
                  <span className="text-sm text-gray-600 font-medium">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => fetchOrders(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || refreshing}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-40 transition-colors"
                  >
                    {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
