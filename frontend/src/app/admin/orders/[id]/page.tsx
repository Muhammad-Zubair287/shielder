'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Package,
  User,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  Box,
  ChevronDown,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { orderService } from '@/services/order.service';
import OrderStatusBadge from '../OrderStatusBadge';
import PaymentStatusBadge from '../PaymentStatusBadge';
import StatusUpdateModal from '../StatusUpdateModal';
import type { Order, OrderStatus } from '../types';
import { getImageUrl } from '@/utils/helpers';

const DELIVERY_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PICKUP_STATUSES: OrderStatus[] = ['READY_FOR_PICKUP', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

function formatCurrency(value: number | string, locale: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusModalTarget, setStatusModalTarget] = useState<OrderStatus | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Fetch order ────────────────────────────────────────────────────────────
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id as string);
      // Service returns response.data → { success, data: order }
      setOrder(res.data || res);
    } catch {
      toast.error(t('fetchOrderFailed'));
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && !authLoading && isAuthenticated && user?.role === 'ADMIN') fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authLoading, isAuthenticated, user]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getProductName = (item: any): string => {
    const trs = item.product?.translations;
    if (trs?.length) {
      const match = trs.find((tr: any) => tr.locale === locale);
      return match?.name || trs[0]?.name || '—';
    }
    return item.product?.name || item.product?.nameEn || '—';
  };

  // ── Loading / empty states ─────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm font-semibold">
          {t('loadingProducts')}
        </p>
      </div>
    );
  }

  if (!order) return null;

  const subtotalNum = parseFloat(String(order.subtotal));
  const taxNum      = parseFloat(String(order.tax));
  const totalNum    = parseFloat(String(order.total));

  const allStatuses = order.deliveryType === 'PICKUP' ? PICKUP_STATUSES : DELIVERY_STATUSES;
  const nextStatuses = allStatuses.filter((s) => s !== order.status);
  const isPickupOrder = order.deliveryType === 'PICKUP';
  const warehouseName = order.warehouse?.name || (order.warehouseId ? `Warehouse #${order.warehouseId}` : '—');
  const warehouseAddress = [
    order.warehouse?.address,
    order.warehouse?.city,
    order.warehouse?.country,
  ].filter(Boolean).join(', ');

  return (
    <main className="space-y-6 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Link href="/admin/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={22} className={`text-gray-500 ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
          <div>
            <div className={`flex items-center gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h1 className="text-2xl font-black text-gray-900">{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
              {isPickupOrder && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  {t('orders.pickupOrderBadge')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {formatDate(order.createdAt, locale)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer size={16} />
            {t('printInvoice')}
          </button>

          {order.status !== 'DELIVERED' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                onBlur={() => setTimeout(() => setShowStatusMenu(false), 200)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#FF5722] text-white rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95"
              >
                {t('updateStatus')}
                <ChevronDown size={15} className={showStatusMenu ? 'rotate-180' : ''} />
              </button>
              {showStatusMenu && (
                <div className={`absolute top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden ${isRTL ? 'left-0' : 'right-0'}`}>
                  {nextStatuses.map((stat) => (
                    <button
                      key={stat}
                      onClick={() => {
                        setStatusModalTarget(stat);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-[#FF6B35] transition-colors flex items-center gap-2`}
                    >
                      <OrderStatusBadge status={stat} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Items table ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`p-5 border-b border-gray-100 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Package size={18} className="text-[#FF6B35]" />
              <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">
                {t('orderedItems')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    {[t('productCol'), t('priceCol'), t('qtyCol'), t('subtotalCol')].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${
                          i === 3 ? (isRTL ? 'text-left' : 'text-right') :
                          i === 2 ? 'text-center' :
                          isRTL ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(order.orderItems || []).map((item: any) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                      {/* Product info */}
                      <td className={`px-5 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {item.product?.mainImage ? (
                              <img
                                src={getImageUrl(item.product.mainImage) || ''}
                                alt="Product"
                                className="w-full h-full object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Box size={20} className="text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm group-hover:text-[#FF6B35] transition-colors">
                              {getProductName(item)}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                              SKU: {item.product?.sku || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Unit price */}
                      <td className="px-5 py-4 text-sm font-bold text-gray-700">
                        {formatCurrency(item.unitPrice, locale)}
                      </td>

                      {/* Quantity */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-xs font-black text-gray-700">
                          ×{item.quantity}
                        </span>
                      </td>

                      {/* Item total */}
                      <td className={`px-5 py-4 font-black text-gray-800 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
                        {formatCurrency(item.totalPrice, locale)}
                      </td>
                    </tr>
                  ))}

                  {(!order.orderItems || order.orderItems.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-gray-400 text-sm">
                        {t('noItemsAdded')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className={`p-6 bg-gray-50/50 border-t border-gray-100 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
              <dl className="w-full max-w-xs space-y-2.5 text-sm">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <dt className="text-gray-500 font-medium">{t('subtotal')}</dt>
                  <dd className="font-bold text-gray-700">{formatCurrency(subtotalNum, locale)}</dd>
                </div>
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <dt className="text-gray-500 font-medium">{t('tax')}</dt>
                  <dd className="font-bold text-gray-700">{formatCurrency(taxNum, locale)}</dd>
                </div>
                <div className={`flex items-center justify-between pt-2.5 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <dt className="text-base font-black text-gray-800">{t('grandTotal')}</dt>
                  <dd className="text-2xl font-black text-[#FF6B35]">{formatCurrency(totalNum, locale)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className={`flex items-center gap-3 pb-3 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-[#FF6B35]/10 text-[#FF6B35] rounded-xl flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {t('customerInfo')}
                </p>
                <p className="font-black text-gray-800 text-sm">{order.customerName}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Mail size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400">{t('emailCol')}</p>
                  <p className="text-sm font-semibold text-gray-700 break-all">
                    {order.users?.email || '—'}
                  </p>
                </div>
              </div>
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400">{t('phoneCol')}</p>
                  <p className="text-sm font-semibold text-gray-700 dir-ltr" dir="ltr">
                    {order.phoneNumber || order.users?.profile?.phoneNumber || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin size={15} className="text-[#FF6B35]" />
              <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                {t('shippingAddress')}
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              {order.shippingAddress}
            </p>
          </div>

          {/* Pickup Information */}
          {isPickupOrder && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-3">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <MapPin size={15} className="text-amber-600" />
                <h3 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                  {t('orders.pickupInformation')}
                </h3>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100">
                <p className="text-sm font-bold text-amber-900">{warehouseName}</p>
                <p className="text-sm text-amber-800 mt-1">{warehouseAddress || t('orders.addressUnavailable')}</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CreditCard size={15} className="text-[#FF6B35]" />
              <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                {t('paymentInfo')}
              </h3>
            </div>
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-gray-500 font-medium">{t('paymentMethod')}</span>
                <span className="font-bold text-gray-700">
                  {order.paymentMethod || '—'}
                </span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-gray-500 font-medium">{t('paymentStatus')}</span>
                <PaymentStatusBadge status={order.paymentStatus} size="sm" />
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
                {t('orderNotes')}
              </p>
              <p className="text-sm text-amber-800">{order.notes}</p>
            </div>
          )}

        </div>
      </div>

      {/* ── Status update modal ── */}
      {statusModalTarget && order && (
        <StatusUpdateModal
          orderId={order.id}
          currentStatus={order.status}
          newStatus={statusModalTarget}
          onClose={() => setStatusModalTarget(null)}
          onSuccess={fetchOrder}
        />
      )}
    </main>
  );
}
