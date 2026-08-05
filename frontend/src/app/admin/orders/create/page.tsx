'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Package,
  MapPin,
  CreditCard,
  Search,
  Loader2,
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { orderService } from '@/services/order.service';
import adminService from '@/services/admin.service';
import { getImageUrl } from '@/utils/helpers';
import { filterPhoneInput } from '@/utils/phoneUtils';
import type { OrderFormItem, CustomerOption, ProductOption } from '../types';

const TAX_RATE = 0.1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function productName(p: ProductOption, locale: string): string {
  if (p.translations && p.translations.length > 0) {
    const localeMatch = p.translations.find((t) => t.locale === locale);
    return localeMatch?.name || p.translations[0].name || p.name || '—';
  }
  return p.name || '—';
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(isNaN(value) ? 0 : value);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateOrderPage() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user?.role === 'SUPER_ADMIN') { router.replace('/superadmin/dashboard'); return; }
    if (user?.role !== 'ADMIN') { router.replace('/login'); }
  }, [authLoading, isAuthenticated, user, router]);

  // ── Customer state ─────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // ── Products state ─────────────────────────────────────────────────────────
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderFormItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch customers ────────────────────────────────────────────────────────
  useEffect(() => {
    setCustomersLoading(true);
    adminService
      .getUsers({ role: 'CUSTOMER', limit: 500 })
      .then((res: any) => {
        const raw: any[] = res.data?.data || res.data?.users || [];
        setCustomers(
          raw.map((u: any) => ({
            id: u.id,
            email: u.email,
            fullName: u.profile?.fullName || u.name || '',
            phoneNumber: u.profile?.phoneNumber || u.phoneNumber || '',
          }))
        );
      })
      .catch(() => setCustomersError(true))
      .finally(() => setCustomersLoading(false));
  }, []);

  // ── Fetch products ─────────────────────────────────────────────────────────
  useEffect(() => {
    adminService
      .getProductsForManagement({ limit: 500, page: 1, isActive: true })
      .then((res: any) => {
        const raw: any[] = res.data?.data || res.data?.products || [];
        setAllProducts(
          raw.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            price: parseFloat(p.price) || 0,
            stock: parseInt(p.stock) || 0,
            mainImage: p.mainImage || p.main_image || null,
            translations: p.translations || [],
            name: p.name || p.nameEn || '',
          }))
        );
      })
      .catch(() => toast.error(t('noProductsFound')))
      .finally(() => setProductsLoading(false));
  }, [t]);

  // ── Auto-fill customer fields when a customer is selected ─────────────────
  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.fullName || '');
      setPhoneNumber(found.phoneNumber || '');
    }
  };

  // ── Filtered product picker ────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter(
      (p) =>
        productName(p, locale).toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }, [allProducts, productSearch, locale]);

  // ── Filtered customers ─────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        (c.fullName || '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── Add product to order ───────────────────────────────────────────────────
  const addProduct = (product: ProductOption) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      toast.error(t('productAlreadyAdded'));
      return;
    }
    if (product.stock <= 0) {
      toast.error(t('outOfStockError'));
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: productName(product, locale),
        sku: product.sku || '',
        unitPrice: product.price,
        stock: product.stock,
        quantity: 1,
        mainImage: product.mainImage,
      },
    ]);
    setShowProductPicker(false);
    setProductSearch('');
  };

  // ── Update quantity ────────────────────────────────────────────────────────
  const updateQuantity = (productId: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, Math.min(qty, item.stock)) }
          : item
      )
    );
  };

  // ── Remove item ────────────────────────────────────────────────────────────
  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // ── Order totals ───────────────────────────────────────────────────────────
  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [items]
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // ── Validation ─────────────────────────────────────────────────────────────
  const stockErrors = items
    .filter((item) => item.quantity > item.stock)
    .map((item) =>
      t('stockExceeded')
        .replace('{stock}', String(item.stock))
        .replace('{name}', item.productName)
    );

  const resolvedUserId = customersError
    ? manualUserId.trim()
    : selectedCustomerId;

  const canSubmit =
    resolvedUserId &&
    customerName.trim() &&
    phoneNumber.trim() &&
    shippingAddress.trim() &&
    items.length > 0 &&
    stockErrors.length === 0;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await orderService.createOrder({
        userId: resolvedUserId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      });
      toast.success(t('orderCreated'));
      router.push('/admin/orders');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('orderCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading guard ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5B5FC7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6 pb-10" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Page header ── */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Link
          href="/admin/orders"
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={22} className={`text-gray-500 ${isRTL ? 'rotate-180' : ''}`} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('createOrderTitle')}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{t('createOrderSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left col: Customer + Products ── */}
        <div className="xl:col-span-2 space-y-5">

          {/* ── Section 1: Customer ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-1.5 bg-[#5B5FC7]/10 rounded-lg">
                <User size={16} className="text-[#5B5FC7]" />
              </div>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                {t('customerDetails')}
              </h2>
            </div>

            {/* Customer selector */}
            {customersLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={15} className="animate-spin" />
                {t('loadingCustomers')}
              </div>
            ) : customersError ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <p className="font-semibold mb-2">{t('manualUserIdNote')}</p>
                <input
                  type="text"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder={t('manualUserIdPh')}
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  {t('selectCustomer')}
                </label>
                {/* Customer search */}
                <div className="relative">
                  <Search size={13} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t('searchCustomerPh')}
                    className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">{t('noCustomersFound')}</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCustomerSelect(c.id)}
                        className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2.5 hover:bg-[#5B5FC7]/5 transition-colors flex items-center justify-between gap-2 ${selectedCustomerId === c.id ? 'bg-[#5B5FC7]/10' : ''}`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {c.fullName || c.email}
                          </p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                        {selectedCustomerId === c.id && (
                          <CheckCircle2 size={15} className="text-[#5B5FC7] flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Customer detail inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {t('customerName')} *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('customerNamePh')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {t('phoneNumber')} *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(filterPhoneInput(e.target.value))}
                  maxLength={20}
                  placeholder={t('phonePh')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Shipping & Payment ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-1.5 bg-[#FF6B35]/10 rounded-lg">
                <MapPin size={16} className="text-[#FF6B35]" />
              </div>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                {t('shippingAddress')} & {t('paymentMethodLabel')}
              </h2>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                {t('shippingAddress')} *
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder={t('shippingAddressPh')}
                rows={3}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {t('paymentMethodLabel')} *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] appearance-none"
                >
                  <option value="CASH">{t('cashOnDelivery')}</option>
                  <option value="CREDIT_CARD">{t('creditCard')}</option>
                  <option value="BANK_TRANSFER">{t('bankTransfer')}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {t('orderNotes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('orderNotesPh')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]"
                />
              </div>
            </div>
          </div>

          {/* ── Section 3: Products ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <Package size={16} className="text-green-600" />
                </div>
                <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                  {t('addProducts')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProductPicker(!showProductPicker)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5B5FC7] hover:bg-[#4a4fb3] text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Plus size={15} />
                {t('addItem')}
              </button>
            </div>

            {/* Product picker dropdown */}
            {showProductPicker && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-100">
                  <div className="relative">
                    <Search size={13} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder={t('searchProducts')}
                      autoFocus
                      className={`w-full py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5FC7] ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                    />
                  </div>
                </div>
                {productsLoading ? (
                  <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                    <Loader2 size={15} className="animate-spin" />
                    {t('loadingProducts')}
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                    {filteredProducts.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-gray-400">
                        {t('noProductsFound')}
                      </p>
                    ) : (
                      filteredProducts.map((p) => {
                        const alreadyAdded = items.some((i) => i.productId === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={alreadyAdded || p.stock === 0}
                            onClick={() => addProduct(p)}
                            className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-3 flex items-center justify-between gap-3 transition-colors disabled:opacity-40 ${alreadyAdded ? 'bg-gray-50' : 'hover:bg-[#5B5FC7]/5'}`}
                          >
                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              {/* Thumbnail */}
                              <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {p.mainImage ? (
                                  <img
                                    src={getImageUrl(p.mainImage) || ''}
                                    alt=""
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Package size={14} className="text-gray-300" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-700">
                                  {productName(p, locale)}
                                </p>
                                <p className="text-[11px] text-gray-400">
                                  {p.sku ? `SKU: ${p.sku} · ` : ''}
                                  {t('availableStock')}: {p.stock}
                                </p>
                              </div>
                            </div>
                            <div className={`text-right flex-shrink-0 ${isRTL ? 'text-left' : ''}`}>
                              <p className="text-sm font-bold text-[#5B5FC7]">
                                {formatCurrency(p.price, locale)}
                              </p>
                              {p.stock === 0 && (
                                <span className="text-[10px] text-red-500 font-bold">{t('orderCancelled')}</span>
                              )}
                              {alreadyAdded && (
                                <span className="text-[10px] text-gray-400">{t('added')}</span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items table */}
            {items.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3 border-2 border-dashed border-gray-100 rounded-xl">
                <ShoppingCart size={32} className="text-gray-200" />
                <p className="text-sm text-gray-400">{t('noItemsAdded')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('productCol')}</th>
                      <th className="px-4 py-3 text-center">{t('unitPrice')}</th>
                      <th className="px-4 py-3 text-center">{t('qtyCol')}</th>
                      <th className="px-4 py-3 text-center">{t('availableStock')}</th>
                      <th className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t('subtotalCol')}</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item) => {
                      const overStock = item.quantity > item.stock;
                      return (
                        <tr key={item.productId} className={overStock ? 'bg-red-50' : 'hover:bg-gray-50/50'}>
                          {/* Product */}
                          <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{item.productName}</p>
                              {item.sku && (
                                <p className="text-[11px] text-gray-400">SKU: {item.sku}</p>
                              )}
                              {overStock && (
                                <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={10} />
                                  {t('stockExceeded').replace('{stock}', String(item.stock))}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Unit price */}
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                            {formatCurrency(item.unitPrice, locale)}
                          </td>

                          {/* Quantity */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={item.stock}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.productId, parseInt(e.target.value) || 1)
                              }
                              className={`w-16 text-center px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 ${overStock ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-[#5B5FC7]'}`}
                            />
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold ${item.stock < 10 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {item.stock}
                            </span>
                          </td>

                          {/* Subtotal */}
                          <td className={`px-4 py-3 font-black text-gray-800 text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
                            {formatCurrency(item.unitPrice * item.quantity, locale)}
                          </td>

                          {/* Remove */}
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stock errors */}
            {stockErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                {stockErrors.map((err, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle size={11} />
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right col: Order summary ── */}
        <div className="xl:col-span-1 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 sticky top-4">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-1.5 bg-[#FF6B35]/10 rounded-lg">
                <CreditCard size={16} className="text-[#FF6B35]" />
              </div>
              <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
                {t('orderSummary')}
              </h2>
            </div>

            <dl className="space-y-3 text-sm">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <dt className="text-gray-500">{t('subtotal')}</dt>
                <dd className="font-bold text-gray-800">
                  {formatCurrency(subtotal, locale)}
                </dd>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <dt className="text-gray-500">{t('tax')} (10%)</dt>
                <dd className="font-bold text-gray-800">
                  {formatCurrency(tax, locale)}
                </dd>
              </div>
              <div
                className={`flex items-center justify-between pt-3 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <dt className="text-base font-black text-gray-800">{t('grandTotal')}</dt>
                <dd className="text-xl font-black text-[#FF6B35]">
                  {formatCurrency(total, locale)}
                </dd>
              </div>
            </dl>

            {/* Items count */}
            {items.length > 0 && (
              <p className="text-[11px] text-gray-400 text-center">
                {items.length} {t('productsLabel').toLowerCase()}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-3 bg-[#FF6B35] hover:bg-[#FF5722] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('submittingOrder')}
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  {t('submitOrder')}
                </>
              )}
            </button>

            {/* Validation hints */}
            {!canSubmit && items.length > 0 && (
              <ul className="space-y-1">
                {!resolvedUserId && (
                  <li className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={10} />{t('selectCustomer')}
                  </li>
                )}
                {!customerName.trim() && (
                  <li className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={10} />{t('customerName')}
                  </li>
                )}
                {!shippingAddress.trim() && (
                  <li className="text-[11px] text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={10} />{t('shippingAddress')}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
