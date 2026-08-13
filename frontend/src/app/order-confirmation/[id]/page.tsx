'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Package,
  Banknote,
  Building2,
  CreditCard,
  Clock,
  Loader2,
  AlertCircle,
  ShoppingBag,
  ChevronRight,
  User,
  Phone,
  MapPin,
  StickyNote,
} from 'lucide-react';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { orderService } from '@/services/order.service';
import { useCart } from '@/contexts/CartContext';
import { getImageUrl } from '@/utils/helpers';
import { useEpgCartClearOnce } from '@/hooks/useEpgCartClearOnce';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product: {
    translations?: Array<{ name: string; locale: string }>;
    attachments?: Array<{ url?: string; fileUrl?: string }>;
    mainImage?: string | null;
    thumbnail?: string | null;
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
  notes?: string | null;
  orderItems: OrderItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER = '/images/landing/factory-1.png';

function statusColor(status: string) {
  const s = status?.toUpperCase();
  if (s === 'CONFIRMED' || s === 'DELIVERED' || s === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700';
  if (s === 'PROCESSING' || s === 'SHIPPED') return 'bg-blue-100 text-blue-700';
  if (s === 'READY_FOR_PICKUP') return 'bg-orange-100 text-orange-700';
  return 'bg-yellow-100 text-yellow-700';
}

function paymentStatusColor(status: string) {
  const s = status?.toUpperCase();
  if (s === 'PAID') return 'bg-green-100 text-green-700';
  if (s === 'FAILED') return 'bg-red-100 text-red-700';
  if (s === 'REFUNDED') return 'bg-purple-100 text-purple-700';
  return 'bg-yellow-100 text-yellow-700';
}

function methodIcon(method: string) {
  const m = method?.toUpperCase();
  if (m === 'CREDIT_CARD') return <CreditCard size={12} />;
  if (m === 'BANK_TRANSFER') return <Building2 size={12} />;
  return <Banknote size={12} />;
}

function formatOrderDate(dateStr: string, locale: string) {
  try {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#0205A6]" size={40} />
      </div>
    }>
      <OrderConfirmationPageInner />
    </Suspense>
  );
}

function EpgSuccessSideEffects({
  orderId,
  paymentSucceeded,
  loading,
  clearCart,
}: {
  orderId: string | undefined;
  paymentSucceeded: boolean;
  loading: boolean;
  clearCart: (options?: { silent?: boolean }) => Promise<void>;
}) {
  const router = useRouter();
  const qParams = useSearchParams();
  const fromEPGQuery = qParams?.get('payment') === 'success';
  const [epgRedirectHandled, setEpgRedirectHandled] = useState(false);

  useEpgCartClearOnce({
    orderId,
    enabled: Boolean(fromEPGQuery && paymentSucceeded),
    clearCart,
  });

  useEffect(() => {
    if (!orderId || !fromEPGQuery || epgRedirectHandled || loading) return;
    setEpgRedirectHandled(true);
    router.replace(`/order-confirmation/${orderId}`, { scroll: false });
  }, [orderId, fromEPGQuery, epgRedirectHandled, loading, router]);

  return null;
}

function OrderConfirmationPageInner() {
  const { t, isRTL, locale } = useLanguage();
  const { clearCart } = useCart();
  const { id }  = useParams<{ id: string }>();

  const [order,   setOrder]   = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Authoritative success comes from the order record — never from the URL alone.
  const paymentSucceeded =
    (order?.paymentStatus || '').toUpperCase() === 'PAID';

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

  const showPaymentSuccessHeader = paymentSucceeded;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#0205A6]" size={40} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LandingNavbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center pt-[120px]">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-lg font-semibold text-gray-700">{error || t('orderConfirmation.notFound')}</p>
          <Link href="/my-orders" className="text-[#0205A6] hover:underline font-medium">
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

  // Prefer backend-resolved thumbnail / mainImage; fall back to raw attachments
  const productImage = (item: OrderItem): string => {
    if (item.product.thumbnail) return item.product.thumbnail;
    if (item.product.mainImage) return item.product.mainImage;
    const raw = item.product.attachments?.[0]?.fileUrl ?? item.product.attachments?.[0]?.url ?? null;
    return getImageUrl(raw) ?? PLACEHOLDER;
  };

  const orderStatusKey   = `orderConfirmation.status.${(order.status || '').toLowerCase()}`;
  const paymentStatusKey = `orderConfirmation.paymentStatus.${(order.paymentStatus || '').toLowerCase()}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <Suspense fallback={null}>
        <EpgSuccessSideEffects
          orderId={id}
          paymentSucceeded={paymentSucceeded}
          loading={loading}
          clearCart={clearCart}
        />
      </Suspense>
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* ── Success Header ────────────────────────────────── */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 size={40} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {showPaymentSuccessHeader ? t('orderConfirmation.paymentSuccess') : t('orderConfirmation.orderPlaced')}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">{t('orderConfirmation.subtitle')}</p>
          </div>

          {/* ── Order Card ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">

            {/* Order Number · Date · Status badges */}
            <div className="p-5 border-b border-gray-100">

              {/* Row 1: Order Number (start) + Order Date (end) */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="text-start min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{t('orderConfirmation.orderNumber')}</p>
                  {/* whitespace-nowrap prevents the order number from wrapping */}
                  <p className="text-sm sm:text-base font-bold text-gray-900 tracking-wide whitespace-nowrap">
                    #{order.orderNumber}
                  </p>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-0.5">{t('orderConfirmation.orderDate')}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatOrderDate(order.createdAt, locale)}
                  </p>
                </div>
              </div>

              {/* Row 2: Status badges on their own row — no competition for space */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>
                  <Clock size={11} />
                  {t('orderConfirmation.orderStatus')}:{' '}
                  {t(orderStatusKey) || order.status}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${paymentStatusColor(order.paymentStatus)}`}>
                  {methodIcon(order.paymentMethod)}
                  {t('orderConfirmation.paymentStatus')}:{' '}
                  {t(paymentStatusKey) || order.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {t('orderConfirmation.shippingTo')}
              </p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">{t('orderConfirmation.customerName')}</p>
                    <p className="text-sm font-semibold text-gray-900">{order.customerName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">{t('orderConfirmation.phoneNumber')}</p>
                    <p className="text-sm font-medium text-gray-700">{order.phoneNumber || '—'}</p>
                  </div>
                </div>
                {order.shippingAddress && (
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">{t('orderConfirmation.address')}</p>
                      <p className="text-sm text-gray-700">{order.shippingAddress}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes — only rendered when the customer provided them */}
            {order.notes && (
              <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/40">
                <div className="flex items-start gap-2.5">
                  <StickyNote size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {t('orderConfirmation.notes')}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{order.notes}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                {t('orderConfirmation.items')}
              </p>
              <div className="space-y-4">
                {order.orderItems.map(item => {
                  const img  = productImage(item);
                  const name = productName(item);
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      {/*
                        Image is always the first flex child.
                        dir="rtl" on the parent container naturally places it
                        on the right side in Arabic — no flex-row-reverse needed.
                      */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                        <Image
                          src={img}
                          alt={name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ×{item.quantity}&nbsp;×&nbsp;<SARSymbol />{Number(item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 flex-shrink-0 inline-flex items-center gap-0.5">
                        <SARSymbol />{Number(item.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>{t('cart.subtotal')}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <SARSymbol />{Number(order.subtotal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>{t('cart.tax')}</span>
                  <span className="inline-flex items-center gap-0.5">
                    <SARSymbol />{Number(order.tax).toFixed(2)}
                  </span>
                </div>
                <hr className="border-dashed border-gray-200 my-2" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>{t('cart.total')}</span>
                  <span className="inline-flex items-center gap-0.5 text-[#0205A6]">
                    <SARSymbol />{Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment method note for Cash / Bank */}
          {order.paymentMethod !== 'CREDIT_CARD' && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
              {order.paymentMethod === 'BANK_TRANSFER'
                ? <Building2 size={20} className="text-[#0205A6] flex-shrink-0 mt-0.5" />
                : <Banknote   size={20} className="text-[#0205A6] flex-shrink-0 mt-0.5" />
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

          {/* ── Action Buttons ────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/my-orders"
              className="flex-1 flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm py-3.5 rounded-2xl transition-colors"
            >
              <Package size={16} />
              {t('orderConfirmation.viewMyOrders')}
            </Link>
            <Link
              href="/products"
              className="flex-1 flex items-center justify-center gap-2 bg-[#004A99] hover:bg-[#003a7a] text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors shadow-sm"
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
