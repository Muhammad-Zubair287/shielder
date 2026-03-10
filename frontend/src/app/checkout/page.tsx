'use client';
export const dynamic = 'force-dynamic';

/**
 * /checkout  –  Checkout Page
 *
 * Supports three payment methods:
 *   1. CASH       – Cash on Delivery
 *   2. BANK_TRANSFER – Customer pays via bank transfer
 *   3. CREDIT_CARD   – Online debit/credit card via EPG payment gateway
 *
 * Flow:
 *   CASH / BANK  → POST /api/orders  → /order-confirmation/[id]
 *   CREDIT_CARD  → POST /api/epg/initialize  → redirect to EPG hosted page
 */

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Banknote,
  Building2,
  MapPin,
  Phone,
  User as UserIcon,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useCart } from '@/contexts/CartContext';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { orderService } from '@/services/order.service';
import { getImageUrl } from '@/utils/helpers';

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD';

// Static shipping cost — replace with dynamic value if needed
const SHIPPING_COST = 0;
const TAX_RATE       = 0.1;

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER = '/images/landing/factory-1.png';

// ── Payment Method Card ───────────────────────────────────────────────────────

interface MethodCardProps {
  id: PaymentMethod;
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  isRTL: boolean;
}

function MethodCard({
  id, icon, title, description, selected, onSelect, isRTL,
}: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all
        ${selected
          ? 'border-[#F97316] bg-orange-50'
          : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/30'}
        ${isRTL ? 'flex-row-reverse text-right' : ''}`}
    >
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
        ${selected ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
      </div>
      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${selected ? 'border-[#F97316]' : 'border-gray-300'}`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />}
      </div>
    </button>
  );
}

// ── Order Summary Row ─────────────────────────────────────────────────────────

function SummaryRow({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-bold text-gray-900' : 'text-gray-600 text-sm'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function CheckoutPageInner() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { cart, loading: cartLoading, clearCart } = useCart();
  const router  = useRouter();
  const params  = useSearchParams();

  // ── Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('checkout_redirect', '/checkout');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Warn when returning from a failed EPG payment
  useEffect(() => {
    if (params?.get('payment') === 'failed') {
      toast.error(t('checkout.paymentFailed'));
    }
  }, [params, t]);

  // ── Form state
  const [form, setForm] = useState({
    customerName:    (user?.profile?.fullName) || '',
    phoneNumber:     (user?.profile?.phoneNumber) || '',
    shippingAddress: '',
    notes:           '',
  });
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting]         = useState(false);

  // Pre-fill name when user loads
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        customerName: prev.customerName || (user?.profile?.fullName ?? ''),
        phoneNumber:  prev.phoneNumber  || (user?.profile?.phoneNumber ?? ''),
      }));
    }
  }, [user]);

  // ── Derived totals
  const subtotal = cart.totalAmount;
  const shipping = SHIPPING_COST;
  const tax      = subtotal * TAX_RATE;
  const total    = subtotal + shipping + tax;

  // ── Field handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Validation
  const validate = (): boolean => {
    if (!form.customerName.trim()) {
      toast.error(t('checkout.errorName'));    return false;
    }
    if (!form.phoneNumber.trim()) {
      toast.error(t('checkout.errorPhone'));    return false;
    }
    if (!form.shippingAddress.trim()) {
      toast.error(t('checkout.errorAddress')); return false;
    }
    return true;
  };

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (cart.items.length === 0) {
      toast.error(t('checkout.emptyCart')); return;
    }

    setSubmitting(true);
    const items = cart.items.map(i => ({ productId: i.productId, quantity: i.quantity }));

    try {
      if (paymentMethod === 'CREDIT_CARD') {
        // EPG card payment
        const res = await orderService.initializeEPGPayment({
          items,
          customerName:    form.customerName,
          phoneNumber:     form.phoneNumber,
          shippingAddress: form.shippingAddress,
          notes:           form.notes || undefined,
        });
        if (res?.data?.paymentUrl) {
          await clearCart();
          window.location.href = res.data.paymentUrl;
        } else {
          toast.error(t('checkout.paymentGatewayError'));
        }
      } else {
        // Cash or Bank Transfer
        const res = await orderService.createOrder({
          userId:          user!.id,
          items,
          customerName:    form.customerName,
          phoneNumber:     form.phoneNumber,
          shippingAddress: form.shippingAddress,
          paymentMethod,
          notes:           form.notes || undefined,
        });
        const orderId = res?.data?.id;
        await clearCart();
        router.push(`/order-confirmation/${orderId}`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('checkout.submitError');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading / empty guard
  if (authLoading || cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#F97316]" size={36} />
      </div>
    );
  }

  if (!cartLoading && cart.items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LandingNavbar />
        <main className="flex-1 pt-28 flex flex-col items-center justify-center gap-4 text-center px-4">
          <ShoppingBag size={48} className="text-gray-300" />
          <p className="text-xl font-bold text-gray-800">{t('checkout.emptyCartTitle')}</p>
          <Link href="/cart" className="text-[#F97316] font-semibold hover:underline">{t('checkout.goToCart')}</Link>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center mb-8 relative">
            <Link
              href="/cart"
              className={`p-2 text-gray-600 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors ${isRTL ? 'ml-auto' : 'mr-auto'}`}
              aria-label="back"
            >
              <BackArrow size={22} />
            </Link>
            <h1 className="absolute inset-x-0 text-center text-xl font-bold text-gray-900 pointer-events-none">
              {t('checkout.title')}
            </h1>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="lg:grid lg:grid-cols-5 lg:gap-8">

              {/* ── Left column: form ───────────────────────────────────── */}
              <div className="lg:col-span-3 space-y-6">

                {/* Shipping Information */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MapPin size={18} className="text-[#F97316]" />
                    {t('checkout.shippingInfo')}
                  </h2>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('checkout.fullName')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon size={16} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="text"
                          name="customerName"
                          value={form.customerName}
                          onChange={handleChange}
                          placeholder={t('checkout.fullNamePlaceholder')}
                          required
                          className={`w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-900
                            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent
                            ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('checkout.phone')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={form.phoneNumber}
                          onChange={handleChange}
                          placeholder={t('checkout.phonePlaceholder')}
                          required
                          className={`w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-900
                            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent
                            ${isRTL ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'}`}
                        />
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('checkout.shippingAddress')} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="shippingAddress"
                        value={form.shippingAddress}
                        onChange={handleChange}
                        rows={3}
                        placeholder={t('checkout.shippingAddressPlaceholder')}
                        required
                        className={`w-full border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-900
                          placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent resize-none
                          ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>

                    {/* Notes (optional) */}
                    <div>
                      <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('checkout.notes')}
                      </label>
                      <input
                        type="text"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder={t('checkout.notesPlaceholder')}
                        className={`w-full border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-900
                          placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent
                          ${isRTL ? 'text-right' : 'text-left'}`}
                      />
                    </div>
                  </div>
                </section>

                {/* Payment Method */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CreditCard size={18} className="text-[#F97316]" />
                    {t('checkout.paymentMethod')}
                  </h2>

                  <div className="space-y-3">
                    <MethodCard
                      id="CASH"
                      icon={<Banknote size={20} />}
                      title={t('checkout.methodCash')}
                      description={t('checkout.methodCashDesc')}
                      selected={paymentMethod === 'CASH'}
                      onSelect={() => setPaymentMethod('CASH')}
                      isRTL={isRTL}
                    />
                    <MethodCard
                      id="BANK_TRANSFER"
                      icon={<Building2 size={20} />}
                      title={t('checkout.methodBank')}
                      description={t('checkout.methodBankDesc')}
                      selected={paymentMethod === 'BANK_TRANSFER'}
                      onSelect={() => setPaymentMethod('BANK_TRANSFER')}
                      isRTL={isRTL}
                    />
                    <MethodCard
                      id="CREDIT_CARD"
                      icon={<CreditCard size={20} />}
                      title={t('checkout.methodCard')}
                      description={t('checkout.methodCardDesc')}
                      selected={paymentMethod === 'CREDIT_CARD'}
                      onSelect={() => setPaymentMethod('CREDIT_CARD')}
                      isRTL={isRTL}
                    />
                  </div>

                  {/* EPG security notice */}
                  {paymentMethod === 'CREDIT_CARD' && (
                    <div className={`mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className={`text-xs text-blue-700 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('checkout.epgSecurityNote')}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              {/* ── Right column: order summary ─────────────────────────── */}
              <div className="lg:col-span-2 mt-6 lg:mt-0">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <ShoppingBag size={18} className="text-[#F97316]" />
                    {t('checkout.orderSummary')}
                    <span className="text-[#F97316] font-normal text-sm">({cart.items.length})</span>
                  </h2>

                  {/* Cart items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                    {cart.items.map(item => {
                      const img = getImageUrl(item.product.thumbnail) ?? PLACEHOLDER;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image src={img} alt={item.product.name} fill className="object-cover" sizes="48px" />
                          </div>
                          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                            <p className="text-xs text-gray-500">×{item.quantity}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 flex-shrink-0 flex items-center gap-0.5">
                            <SARSymbol />{item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <hr className="border-gray-100 mb-3" />

                  {/* Totals */}
                  <div className="space-y-1">
                    <SummaryRow
                      label={t('cart.subtotal')}
                      value={<span className="flex items-center gap-0.5"><SARSymbol />{subtotal.toFixed(2)}</span>}
                    />
                    <SummaryRow
                      label={t('cart.shipping')}
                      value={shipping === 0 ? t('cart.free') : <span className="flex items-center gap-0.5"><SARSymbol />{(shipping as number).toFixed(2)}</span>}
                    />
                    <SummaryRow
                      label={t('cart.tax')}
                      value={<span className="flex items-center gap-0.5"><SARSymbol />{tax.toFixed(2)}</span>}
                    />
                    <hr className="border-dashed border-gray-200 my-2" />
                    <SummaryRow
                      label={t('cart.total')}
                      value={<span className="flex items-center gap-0.5"><SARSymbol />{total.toFixed(2)}</span>}
                      bold
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={submitting || cart.items.length === 0}
                    className="mt-5 w-full bg-[#F97316] hover:bg-[#e8650a] active:bg-[#d45d0a] text-white
                      font-semibold text-base py-4 rounded-2xl transition-colors disabled:opacity-50
                      disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" />{t('checkout.processing')}</>
                    ) : paymentMethod === 'CREDIT_CARD' ? (
                      <><CreditCard size={18} />{t('checkout.payNow')}</>
                    ) : (
                      <>{t('checkout.placeOrder')}<ChevronRight size={18} className={isRTL ? 'rotate-180' : ''} /></>
                    )}
                  </button>

                  <p className={`text-xs text-gray-400 text-center mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('checkout.secureCheckout')}
                  </p>
                </div>
              </div>

            </div>
          </form>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#F97316]" size={36} />
      </div>
    }>
      <CheckoutPageInner />
    </Suspense>
  );
}
