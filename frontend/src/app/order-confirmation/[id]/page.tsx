'use client';

/**
 * /order-confirmation/[id]  –  Order Confirmation Page
 *
 * Shows after:
 *   - Cash / Bank Transfer order is placed (from checkout page)
 *   - EPG card payment succeeds (EPG redirects here with ?payment=success)
 *
 * Displays:
 *   - Success animation
 *   - Order number & status
 *   - Items list with totals
 *   - Payment method badge
 *   - Links: view all orders, continue shopping
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Package,
  Banknote,
  Building2,
  CreditCard,
  Clock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { orderService } from '@/services/order.service';
import { getImageUrl } from '@/utils/helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    translations?: Array<{ name: string; locale: string }>;
    attachments?: Array<{ url: string }>;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  total: number;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  createdAt: string;
  orderItems: OrderItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER = '/images/landing/factory-1.png';

function statusColor(status: string) {
  const s = status?.toUpperCase();
  if (s === 'CONFIRMED' || s === 'DELIVERED') return 'bg-green-100 text-green-700';
  if (s === 'CANCELLED')                      return 'bg-red-100 text-red-700';
  if (s === 'PROCESSING' || s === 'SHIPPED')  return 'bg-blue-100 text-blue-700';
  return 'bg-orange-100 text-orange-700'; // PENDING
}

function paymentStatusColor(status: string) {
  const s = status?.toUpperCase();
  if (s === 'PAID')     return 'bg-green-100 text-green-700';
  if (s === 'FAILED')   return 'bg-red-100 text-red-700';
  if (s === 'REFUNDED') return 'bg-purple-100 text-purple-700';
  return 'bg-yellow-100 text-yellow-700'; // PENDING / UNPAID
}

function methodIcon(method: string) {
  const m = method?.toUpperCase();
  if (m === 'CREDIT_CARD') return <CreditCard size={14} />;
  if (m === 'BANK_TRANSFER') return <Building2 size={14} />;
  return <Banknote size={14} />;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderConfirmationPage() {
  const { t, isRTL, locale } = useLanguage();
  const { id }    = useParams<{ id: string }>();
  const qParams   = useSearchParams();
  const fromEPG   = qParams?.get('payment') === 'success';

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    orderService.getOrderById(id)
      .then(res => {
        setOrder(res.data ?? res);
        setLoading(false);
      })
      .catch(() => {
        setError(t('orderConfirmation.loadError'));
        setLoading(false);
      });
  }, [id, t]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#F97316]" size={40} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LandingNavbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center pt-24">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-lg font-semibold text-gray-700">{error || t('orderConfirmation.notFound')}</p>
          <Link href="/my-orders" className="text-[#F97316] hover:underline font-medium">
            {t('orderConfirmation.viewMyOrders')}
          </Link>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const productName = (item: OrderItem) => {
    if (item.product.translations?.length) {
      const match = item.product.translations.find(tr => tr.locale === locale);
      return match?.name || item.product.translations[0]?.name || '—';
    }
    return '—';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {fromEPG ? t('orderConfirmation.paymentSuccess') : t('orderConfirmation.orderPlaced')}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">{t('orderConfirmation.subtitle')}</p>
          </div>

          {/* Order Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

            {/* Order Number + Statuses */}
            <div className={`p-5 border-b border-gray-100 flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-500">{t('orderConfirmation.orderNumber')}</p>
                <p className="text-base font-bold text-gray-900 tracking-wide">#{order.orderNumber}</p>
              </div>
              <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                  <Clock size={11} />
                  {t(`orderConfirmation.status.${order.status.toLowerCase()}`) || order.status}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${paymentStatusColor(order.paymentStatus)}`}>
                  {methodIcon(order.paymentMethod)}
                  {t(`orderConfirmation.paymentStatus.${order.paymentStatus.toLowerCase()}`) || order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className={`p-5 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('orderConfirmation.shippingTo')}</p>
              <p className="text-sm font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{order.phoneNumber}</p>
              <p className="text-sm text-gray-600 mt-0.5">{order.shippingAddress}</p>
            </div>

            {/* Items */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('orderConfirmation.items')}</p>
              <div className="space-y-3">
                {order.orderItems.map(item => {
                  const img = getImageUrl(item.product.attachments?.[0]?.url ?? null) ?? PLACEHOLDER;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <Image src={img} alt={productName(item)} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <p className="text-sm font-medium text-gray-800 truncate">{productName(item)}</p>
                        <p className="text-xs text-gray-500">
                          ×{item.quantity} &nbsp;×&nbsp; <SARSymbol />{Number(item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0 flex items-center gap-0.5">
                        <SARSymbol />{Number(item.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="p-5">
              <div className={`space-y-2 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`flex justify-between text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('cart.subtotal')}</span>
                  <span className="flex items-center gap-0.5"><SARSymbol />{Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('cart.tax')}</span>
                  <span className="flex items-center gap-0.5"><SARSymbol />{Number(order.tax).toFixed(2)}</span>
                </div>
                <hr className="border-dashed border-gray-200 my-2" />
                <div className={`flex justify-between font-bold text-base text-gray-900 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('cart.total')}</span>
                  <span className="flex items-center gap-0.5 text-[#F97316]"><SARSymbol />{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment method note for Cash / Bank */}
          {order.paymentMethod !== 'CREDIT_CARD' && (
            <div className={`flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-6 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              {order.paymentMethod === 'BANK_TRANSFER'
                ? <Building2 size={20} className="text-[#F97316] flex-shrink-0 mt-0.5" />
                : <Banknote   size={20} className="text-[#F97316] flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {order.paymentMethod === 'BANK_TRANSFER'
                    ? t('orderConfirmation.bankTransferNote')
                    : t('orderConfirmation.cashNote')}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{t('orderConfirmation.teamWillContact')}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Link
              href="/my-orders"
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm py-3.5 rounded-2xl transition-colors"
            >
              <Package size={16} />
              {t('orderConfirmation.viewMyOrders')}
            </Link>
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#e8650a] text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors shadow-sm"
            >
              <ShoppingBag size={16} />
              {t('orderConfirmation.continueShopping')}
              <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </Link>
          </div>

        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
