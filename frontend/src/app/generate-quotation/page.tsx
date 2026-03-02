'use client';

/**
 * /generate-quotation
 *
 * Customer self-service quotation form.
 * Reads selected product(s) from sessionStorage (set by products page).
 * Falls back to cart items if nothing selected.
 * Requires authentication — redirects to /login if not signed in.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import { useCart } from '@/contexts/CartContext';
import customerQuotationService, { QuotationProduct } from '@/services/customerQuotation.service';

const PLACEHOLDER = '/images/landing/factory-1.png';
const SESSION_KEY = 'quotation_products';

// ── Validation ────────────────────────────────────────────────────────────────

interface FormState {
  companyName: string;
  vatNumber: string;
  address: string;
}

interface FormErrors {
  companyName?: string;
  vatNumber?: string;
  address?: string;
}

function validate(form: FormState, t: (k: string) => string): FormErrors {
  const errors: FormErrors = {};
  if (!form.companyName.trim()) errors.companyName = t('quot.companyRequired');
  if (!form.vatNumber.trim())   errors.vatNumber   = t('quot.vatRequired');
  else if (!/^\d{10,20}$/.test(form.vatNumber.replace(/[\s-]/g, '')))
    errors.vatNumber = t('quot.vatInvalid');
  if (!form.address.trim())     errors.address     = t('quot.addressRequired');
  return errors;
}

// ── Field Component ───────────────────────────────────────────────────────────

function Field({
  label, placeholder, value, onChange, error, type = 'text', isRTL, rows,
}: {
  label: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string;
  type?: string; isRTL: boolean; rows?: number;
}) {
  const base = `w-full border rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400
    focus:outline-none focus:ring-2 transition-colors
    ${error ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-[#0D1637]/20 focus:border-[#0D1637] bg-white'}
    ${isRTL ? 'text-right' : 'text-left'}`;

  return (
    <div>
      <label className={`block text-sm font-semibold text-gray-800 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
        {label} <span className="text-red-500">*</span>
      </label>
      {rows ? (
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${base} resize-none`}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={base}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      )}
      {error && (
        <p className={`flex items-center gap-1 mt-1.5 text-xs text-red-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GenerateQuotationPage() {
  const { t, isRTL } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const { cart } = useCart();
  const router = useRouter();

  const [products, setProducts] = useState<QuotationProduct[]>([]);
  const [form, setForm] = useState<FormState>({ companyName: '', vatNumber: '', address: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // ── Load products on mount ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '/generate-quotation');
      router.replace('/login');
      return;
    }

    // Priority: sessionStorage selection first
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: QuotationProduct[] = JSON.parse(raw);
        if (parsed.length > 0) { setProducts(parsed); return; }
      }
    } catch { /* ignore */ }

    // Fall back to cart items
    if (cart.items.length > 0) {
      setProducts(
        cart.items.map(item => ({
          productId: item.productId,
          name:      item.product.name,
          price:     item.priceAtTime,
          quantity:  item.quantity,
          thumbnail: item.product.thumbnail,
        })),
      );
    }
  }, [isAuthenticated, router, cart.items]);

  // ── Field change ────────────────────────────────────────────────────────────

  const set = (key: keyof FormState) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (products.length === 0) {
      toast.error(t('quot.productsRequired'));
      return;
    }

    const errs = validate(form, t);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const result = await customerQuotationService.generate({
        companyName: form.companyName,
        vatNumber:   form.vatNumber,
        address:     form.address,
        products,
      });

      // Clear selected products from session
      sessionStorage.removeItem(SESSION_KEY);

      toast.success(t('quot.successMsg'));
      router.push(`/my-quotation/${result.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (err?.response?.status >= 500) {
        toast.error(t('quot.serverError'));
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error(t('quot.errorMsg'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Back link */}
          <Link
            href="/products"
            className={`inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0D1637] mb-6 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <BackArrow size={16} />
            {t('quot.backToProducts')}
          </Link>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Header band */}
            <div className="bg-[#0D1637] px-8 py-7">
              <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-[#F97316] flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">{t('quot.pageTitle')}</h1>
              </div>
              <p className={`text-sm text-gray-300 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                {t('quot.subtitle')}
              </p>
            </div>

            {/* Body */}
            <div className="px-8 py-7">

              {/* Selected products summary */}
              {products.length > 0 && (
                <div className="mb-7">
                  <p className={`text-sm font-bold text-gray-800 mb-3 ${isRTL ? 'text-right' : ''}`}>
                    {t('quot.selectedProducts')}
                  </p>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                    {products.map((p, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          <Image
                            src={p.thumbnail ?? PLACEHOLDER}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold text-gray-900 truncate ${isRTL ? 'text-right' : ''}`}>
                            {p.name}
                          </p>
                          {p.sku && (
                            <p className={`text-xs text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                              {t('quot.sku')}: {p.sku}
                            </p>
                          )}
                        </div>
                        <div className={`shrink-0 text-right ${isRTL ? 'text-left' : ''}`}>
                          <p className="text-sm font-bold text-[#0D1637]">
                            SAR {(p.price * p.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t('quot.qty')}: {p.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No products warn */}
              {products.length === 0 && (
                <div className={`mb-6 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {t('quot.productsRequired')}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <Field
                  label={t('quot.companyName')}
                  placeholder={t('quot.companyNamePH')}
                  value={form.companyName}
                  onChange={set('companyName')}
                  error={errors.companyName}
                  isRTL={isRTL}
                />
                <Field
                  label={t('quot.vatNumber')}
                  placeholder={t('quot.vatNumberPH')}
                  value={form.vatNumber}
                  onChange={set('vatNumber')}
                  error={errors.vatNumber}
                  isRTL={isRTL}
                />
                <Field
                  label={t('quot.address')}
                  placeholder={t('quot.addressPH')}
                  value={form.address}
                  onChange={set('address')}
                  error={errors.address}
                  isRTL={isRTL}
                  rows={3}
                />

                {/* Actions */}
                <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    type="submit"
                    disabled={submitting || products.length === 0}
                    className="flex-1 bg-[#F97316] hover:bg-[#e8650a] text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {submitting ? t('quot.generatingPDF') : t('quot.generatePDF')}
                  </button>
                  <Link
                    href="/products"
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl transition-colors text-sm text-center"
                  >
                    {t('quot.cancel')}
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
