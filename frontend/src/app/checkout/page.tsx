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
  ChevronLeft,
  Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import { useCart } from '@/contexts/CartContext';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import { orderService } from '@/services/order.service';
import cartService from '@/services/cart.service';
import { warehouseService, type Warehouse as WarehouseType } from '@/services/warehouse.service';
import { getImageUrl } from '@/utils/helpers';
import { broadcastSync } from '@/lib/crossTabSync';

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD';
type DeliveryType = 'DELIVERY' | 'PICKUP';

// Static shipping cost — replace with dynamic value if needed
const SHIPPING_COST = 0;
const TAX_RATE       = 0.1;

const LIMITS = { name: 100, phone: 20, address: 200, notes: 500 } as const;

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
      aria-pressed={selected}
      aria-label={title}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all
        ${selected
          ? 'border-[#0205A6] bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}
        ${isRTL ? 'flex-row-reverse text-right' : 'text-start'}`}
    >
      <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
        ${selected ? 'bg-[#0205A6] text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
      </div>
      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${selected ? 'border-[#0205A6]' : 'border-gray-300'}`}>
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[#0205A6]" />}
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
  const { cart, loading: cartLoading, clearCart, refreshCart } = useCart();
  const router  = useRouter();
  const params  = useSearchParams();

  // ── Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '/checkout');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Warn when returning from a failed EPG payment
  useEffect(() => {
    if (params?.get('payment') === 'failed') {
      toast.error(t('checkout.paymentFailed'));
    }
  }, [params, t]);

  // ── Fetch warehouses (for PICKUP delivery)
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setWarehousesLoading(true);
        const res = await warehouseService.listActiveForCheckout();
        setWarehouses(res?.data || []);
      } catch (err) {
        console.error('Failed to load warehouses:', err);
        // Silently fail - user can still use delivery
      } finally {
        setWarehousesLoading(false);
      }
    };
    
    fetchWarehouses();
  }, []);

  // ── Form state
  const [form, setForm] = useState({
    customerName:    (user?.profile?.fullName) || '',
    phoneNumber:     (user?.profile?.phoneNumber) || '',
    shippingAddress: '',
    notes:           '',
  });
  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethod>('CASH');
  const [deliveryType, setDeliveryType]     = useState<DeliveryType>('DELIVERY');
  const [warehouseId, setWarehouseId]       = useState<string | null>(null);
  const [warehouses, setWarehouses]         = useState<WarehouseType[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId) || null;

  const warehouseCountryLine = (() => {
    if (!selectedWarehouse?.country?.trim()) return 'SAUDI ARABIA';
    return /saudi|ksa|السعود/i.test(selectedWarehouse.country)
      ? 'SAUDI ARABIA'
      : selectedWarehouse.country.trim().toUpperCase();
  })();

  const warehouseAddressLines = selectedWarehouse
    ? [
        selectedWarehouse.name?.trim(),
        selectedWarehouse.address?.trim(),
        selectedWarehouse.city?.trim() ? selectedWarehouse.city.trim().toUpperCase() : '',
        warehouseCountryLine,
      ].filter((line): line is string => Boolean(line))
    : [];

  const pickupNoAddressText = (() => {
    const value = t('checkout.pickupNoShippingAddress');
    if (!value || value === 'checkout.pickupNoShippingAddress') {
      return locale === 'ar'
        ? 'لا يلزم إدخال عنوان شحن عند اختيار الاستلام من المستودع.'
        : 'No shipping address is needed for pickup orders.';
    }
    return value;
  })();

  const pickupWarehouseNoteText = (() => {
    const value = t('checkout.pickupWarehouseNote');
    if (!value || value === 'checkout.pickupWarehouseNote') {
      return locale === 'ar'
        ? 'سيتم استلام الطلب من المستودع الذي اخترته.'
        : 'Your order will be collected from the selected warehouse.';
    }
    return value;
  })();

  const cashMethodTitle = (() => {
    if (deliveryType === 'PICKUP') {
      const value = t('checkout.methodCashPickup');
      if (!value || value === 'checkout.methodCashPickup') {
        return locale === 'ar'
          ? 'الدفع عند الاستلام من المستودع'
          : 'Cash on Pickup';
      }
      return value;
    }

    return t('checkout.methodCash');
  })();

  const cashMethodDescription = (() => {
    if (deliveryType === 'PICKUP') {
      const value = t('checkout.methodCashPickupDesc');
      if (!value || value === 'checkout.methodCashPickupDesc') {
        return locale === 'ar'
          ? 'ادفع نقدًا عند استلام طلبك من المستودع.'
          : 'Pay in cash when you collect your order from the warehouse.';
      }
      return value;
    }

    return t('checkout.methodCashDesc');
  })();
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

  // ── Field handler (enforces per-field character limits)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const limit = LIMITS[name as keyof typeof LIMITS];
    setForm(prev => ({ ...prev, [name]: limit ? value.slice(0, limit) : value }));
  };

  // ── Validation
  const validate = (): boolean => {
    if (!form.customerName.trim()) {
      toast.error(t('checkout.errorName')); return false;
    }
    if (form.customerName.trim().length > LIMITS.name) {
      toast.error(t('checkout.errorNameTooLong')); return false;
    }
    if (!form.phoneNumber.trim()) {
      toast.error(t('checkout.errorPhone')); return false;
    }
    if (deliveryType === 'DELIVERY' && !form.shippingAddress.trim()) {
      toast.error(t('checkout.errorAddress')); return false;
    }
    if (deliveryType === 'DELIVERY' && form.shippingAddress.trim().length > LIMITS.address) {
      toast.error(t('checkout.errorAddressTooLong')); return false;
    }
    if (deliveryType === 'PICKUP' && !warehouseId) {
      toast.error(t('checkout.errorWarehouse')); return false;
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
    const shippingAddress = deliveryType === 'DELIVERY' ? form.shippingAddress : '';

    try {
      // Re-validate cart against server before submitting
      const serverCart = await cartService.getCart();
      if (serverCart.items.length === 0) {
        toast.error(t('checkout.cartChangedSinceLastView'));
        await refreshCart();
        setSubmitting(false);
        return;
      }
      const items = serverCart.items.map(i => ({ productId: i.productId, quantity: i.quantity }));

      if (paymentMethod === 'CREDIT_CARD') {
        // EPG card payment
        const res = await orderService.initializeEPGPayment({
          items,
          customerName:    form.customerName,
          phoneNumber:     form.phoneNumber,
          shippingAddress,
          notes:           form.notes || undefined,
          ...(deliveryType === 'PICKUP' && { deliveryType: 'PICKUP', warehouseId }),
        });
        if (res?.data?.paymentUrl) {
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
          shippingAddress,
          paymentMethod,
          notes:           form.notes || undefined,
          ...(deliveryType === 'PICKUP' && { deliveryType: 'PICKUP', warehouseId }),
        });
        const orderId = res?.data?.id;
        // Clear cart silently — don't let cart-clear errors surface as checkout errors
        try { await clearCart({ silent: true }); } catch { /* ignore */ }
        // Notify other tabs: orders list changed
        broadcastSync({ type: 'DATA_CHANGED', module: 'orders' });
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
        <Loader2 className="animate-spin text-[#0205A6]" size={36} />
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
          <Link href="/cart" className="text-[#0205A6] font-semibold hover:underline">{t('checkout.goToCart')}</Link>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center mb-8 relative">
            <Link
              href="/cart"
              className="p-2 text-gray-600 hover:text-[#123C9C] hover:bg-blue-50 rounded-lg transition-colors"
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

                {/* Delivery Method */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Warehouse size={18} className="text-[#0205A6]" />
                    {t('checkout.deliveryMethod')}
                  </h2>

                  <div className="space-y-4">
                    {/* Delivery Type: Home Delivery */}
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors
                      ${deliveryType === 'DELIVERY'
                        ? 'border-[#0205A6] bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}
                      ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        deliveryType === 'DELIVERY' ? 'border-[#0205A6]' : 'border-gray-300'
                      }`}>
                        {deliveryType === 'DELIVERY' && <div className="w-2.5 h-2.5 rounded-full bg-[#0205A6]" />}
                      </div>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="DELIVERY"
                        checked={deliveryType === 'DELIVERY'}
                        onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{t('checkout.deliveryHome')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t('checkout.deliveryHomeDesc')}</p>
                      </div>
                    </label>

                    {/* Delivery Type: Pickup from Warehouse */}
                    <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors
                      ${deliveryType === 'PICKUP'
                        ? 'border-[#0205A6] bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}
                      ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        deliveryType === 'PICKUP' ? 'border-[#0205A6]' : 'border-gray-300'
                      }`}>
                        {deliveryType === 'PICKUP' && <div className="w-2.5 h-2.5 rounded-full bg-[#0205A6]" />}
                      </div>
                      <input
                        type="radio"
                        name="deliveryType"
                        value="PICKUP"
                        checked={deliveryType === 'PICKUP'}
                        onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{t('checkout.deliveryPickup')}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t('checkout.deliveryPickupDesc')}</p>
                      </div>
                    </label>

                    {/* Warehouse Selector (only show when PICKUP selected) */}
                    {deliveryType === 'PICKUP' && (
                      <div className="mt-4">
                        <label htmlFor="warehouse-select" className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-start'}`}>
                          {t('checkout.selectWarehouse')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="warehouse-select"
                            value={warehouseId || ''}
                            onChange={(e) => setWarehouseId(e.target.value || null)}
                            disabled={warehousesLoading || warehouses.length === 0}
                            className={`w-full border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-900
                              bg-white focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent
                              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400
                              ${isRTL ? 'text-right' : 'text-start'}`}
                          >
                            <option value="">
                              {warehousesLoading
                                ? t('checkout.loadingWarehouses')
                                : warehouses.length === 0
                                  ? (locale === 'ar' ? 'لا توجد مستودعات متاحة حالياً للاستلام' : 'No pickup warehouses available right now')
                                  : t('checkout.selectWarehousePlaceholder')}
                            </option>
                            {warehouses.map(warehouse => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} {warehouse.city && `- ${warehouse.city}`}
                              </option>
                            ))}
                          </select>
                          {!warehouseId && deliveryType === 'PICKUP' && (
                            <div className={`flex items-start gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                              <p className={`text-xs text-red-600 ${isRTL ? 'text-right' : 'text-start'}`}>
                                {t('checkout.warehouseRequired')}
                              </p>
                            </div>
                          )}
                        </div>

                        {selectedWarehouse && warehouseAddressLines.length > 0 && (
                          <div className={`mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4 ${isRTL ? 'text-right' : 'text-start'}`}>
                            <p className="text-xs font-semibold tracking-wide text-blue-800 uppercase mb-2">
                              {locale === 'ar' ? 'عنوان المستودع للاستلام' : 'Pickup Warehouse Address'}
                            </p>
                            <address className="not-italic text-sm text-blue-900 leading-6 whitespace-pre-line">
                              {warehouseAddressLines.map((line, index) => (
                                <span key={`${selectedWarehouse.id}-${index}`} className="block">
                                  {line}
                                </span>
                              ))}
                            </address>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Shipping Information */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MapPin size={18} className="text-[#0205A6]" />
                    {deliveryType === 'PICKUP' ? t('checkout.customerInfo') || 'Customer Information' : t('checkout.shippingInfo')}
                  </h2>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="checkout-customer-name" className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-start'}`}>
                        {t('checkout.fullName')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <UserIcon size={16} className="absolute top-1/2 -translate-y-1/2 text-gray-400 start-3" />
                        <input
                          id="checkout-customer-name"
                          type="text"
                          name="customerName"
                          value={form.customerName}
                          onChange={handleChange}
                          placeholder={t('checkout.fullNamePlaceholder')}
                          required
                          maxLength={LIMITS.name}
                          className={`w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-900
                            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent
                            ${isRTL ? 'pe-9 ps-3 text-right' : 'ps-9 pe-3 text-start'}`}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${form.customerName.length >= LIMITS.name ? 'text-red-500' : 'text-gray-400'} ${isRTL ? 'text-right' : 'text-start'}`}>
                        {form.customerName.length}/{LIMITS.name}
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="checkout-phone-number" className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-start'}`}>
                        {t('checkout.phone')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute top-1/2 -translate-y-1/2 text-gray-400 start-3" />
                        <input
                          id="checkout-phone-number"
                          type="tel"
                          name="phoneNumber"
                          value={form.phoneNumber}
                          onChange={handleChange}
                          placeholder={t('checkout.phonePlaceholder')}
                          required
                          className={`w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-900
                            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent
                            ${isRTL ? 'pe-9 ps-3 text-right' : 'ps-9 pe-3 text-start'}`}
                        />
                      </div>
                    </div>

                    {deliveryType === 'DELIVERY' ? (
                      <>
                        {/* Shipping Address */}
                        <div>
                          <label htmlFor="checkout-shipping-address" className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-start'}`}>
                            {t('checkout.shippingAddress')} <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="checkout-shipping-address"
                            name="shippingAddress"
                            value={form.shippingAddress}
                            onChange={handleChange}
                            rows={3}
                            placeholder={t('checkout.shippingAddressPlaceholder')}
                            required
                            maxLength={LIMITS.address}
                            className={`w-full border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-900
                              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent resize-none
                              ${isRTL ? 'text-right' : 'text-start'}`}
                          />
                          <p className={`text-xs mt-1 ${form.shippingAddress.length >= LIMITS.address ? 'text-red-500' : 'text-gray-400'} ${isRTL ? 'text-right' : 'text-start'}`}>
                            {form.shippingAddress.length}/{LIMITS.address}
                          </p>
                        </div>

                        {/* Notes (optional) */}
                        <div>
                          <label htmlFor="checkout-notes" className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-start'}`}>
                            {t('checkout.notes')}
                          </label>
                          <textarea
                            id="checkout-notes"
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={2}
                            placeholder={t('checkout.notesPlaceholder')}
                            maxLength={LIMITS.notes}
                            className={`w-full border border-gray-200 rounded-xl py-3 px-3 text-sm text-gray-900
                              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-transparent resize-none
                              ${isRTL ? 'text-right' : 'text-start'}`}
                          />
                          <p className={`text-xs mt-1 ${form.notes.length >= LIMITS.notes ? 'text-red-500' : 'text-gray-400'} ${isRTL ? 'text-right' : 'text-start'}`}>
                            {form.notes.length}/{LIMITS.notes}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className={`rounded-xl border border-amber-100 bg-amber-50 p-4 ${isRTL ? 'text-right' : 'text-start'}`}>
                        <p className="text-sm font-semibold text-amber-900 leading-tight">
                          {pickupNoAddressText}
                        </p>
                        <p className="text-xs text-amber-700 mt-0 leading-tight">
                          {pickupWarehouseNoteText}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Payment Method */}
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <h2 className={`text-base font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CreditCard size={18} className="text-[#0205A6]" />
                    {t('checkout.paymentMethod')}
                  </h2>

                  <div className="space-y-3">
                    <MethodCard
                      id="CASH"
                      icon={<Banknote size={20} />}
                      title={cashMethodTitle}
                      description={cashMethodDescription}
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
                      <p className={`text-xs text-blue-700 leading-relaxed ${isRTL ? 'text-right' : 'text-start'}`}>
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
                    <ShoppingBag size={18} className="text-[#0205A6]" />
                    {t('checkout.orderSummary')}
                    <span className="text-[#0205A6] font-normal text-sm">({cart.items.length})</span>
                  </h2>

                  {/* Cart items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pe-1 mb-4">
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
                          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-start'}`}>
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
                    className="mt-5 w-full bg-[#123C9C] hover:bg-[#0D2F8C] active:bg-[#0a2570] text-white
                      font-semibold text-base py-4 rounded-2xl transition-colors disabled:opacity-50
                      disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" />{t('checkout.processing')}</>
                    ) : (
                      <>{isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}Checkout</>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-3">
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
        <Loader2 className="animate-spin text-[#0205A6]" size={36} />
      </div>
    }>
      <CheckoutPageInner />
    </Suspense>
  );
}
