'use client';

/**
 * QuotationDrawer
 * Right-side slide-in panel.
 * Shows the quotation basket, lets the user fill in company details, and
 * generates a PDF.  Opens/closes via QuotationContext.openDrawer / closeDrawer.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash2, Plus, Minus, FileText, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuotation } from '@/contexts/QuotationContext';
import { useAuthStore } from '@/store/auth.store';
import { useLanguage } from '@/contexts/LanguageContext';
import customerQuotationService from '@/services/customerQuotation.service';
import { getImageUrl } from '@/utils/helpers';
import SARSymbol from '@/components/SARSymbol';

const PLACEHOLDER = '/images/landing/factory-1.png';

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

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.companyName.trim()) errors.companyName = 'Company name is required';
  if (!form.vatNumber.trim()) {
    errors.vatNumber = 'VAT number is required';
  } else if (!/^\d{10,20}$/.test(form.vatNumber.replace(/[\s-]/g, ''))) {
    errors.vatNumber = 'Enter a valid VAT number (10-20 digits)';
  }
  if (!form.address.trim()) errors.address = 'Address is required';
  return errors;
}

export default function QuotationDrawer() {
  const { items, itemCount, removeItem, updateQty, clearBasket, drawerOpen, closeDrawer } =
    useQuotation();
  const { isAuthenticated } = useAuthStore();
  const { isRTL, t } = useLanguage();
  const router = useRouter();

  const [form, setForm]         = useState<FormState>({ companyName: '', vatNumber: '', address: '' });
  const [errors, setErrors]     = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const setField = (key: keyof FormState) => (value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '/generate-quotation');
      closeDrawer();
      router.push('/login');
      return;
    }

    if (items.length === 0) {
      toast.error(t('quotationDrawer.addOneProductFirst'));
      return;
    }

    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const result = await customerQuotationService.generate({
        companyName: form.companyName,
        vatNumber:   form.vatNumber,
        address:     form.address,
        products:    items.map(i => ({
          productId: i.productId,
          name:      i.name,
          sku:       i.sku,
          price:     i.price,
          quantity:  i.quantity,
          thumbnail: i.thumbnail,
        })),
      });

      clearBasket();
      closeDrawer();
      toast.success(t('quotationDrawer.generated'));
      router.push(`/my-quotation/${result.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg || t('quotationDrawer.generateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const grand = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (!drawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
        onClick={closeDrawer}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 bottom-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col
          transition-transform duration-300
          ${isRTL ? 'left-0' : 'right-0'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0D1637] flex items-center justify-center">
              <Download size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Quotation Basket</h2>
              <p className="text-xs text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty state */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 px-6">
              <FileText size={40} className="opacity-30" />
              <p className="text-sm text-center">
                Your quotation basket is empty.
                <br />Go to the Products page and click <strong>Get Quotation</strong>.
              </p>
            </div>
          )}

          {/* Item list */}
          {items.length > 0 && (
            <div className="divide-y divide-gray-50 px-5 pt-4">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 py-3">
                  {/* Thumbnail */}
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(item.thumbnail) ?? PLACEHOLDER}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    {item.sku && (
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    )}
                    <p className="text-xs font-bold text-[#0D1637] flex items-center gap-0.5 mt-0.5">
                      <SARSymbol />{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (item.quantity <= 1) {
                          removeItem(item.productId);
                          return;
                        }
                        updateQty(item.productId, item.quantity - 1);
                      }}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Grand total */}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-bold text-gray-700">Total</span>
                <span className="text-sm font-bold text-[#0D1637] flex items-center gap-0.5">
                  <SARSymbol />{grand.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* ── Company details form ── */}
          {items.length > 0 && (
            <form onSubmit={handleGenerate} id="quotation-form" className="px-5 pb-4 space-y-4 mt-2">
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-800 mb-3">Company Details</p>

                {/* Company Name */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp Ltd."
                    value={form.companyName}
                    onChange={e => setField('companyName')(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors
                      ${errors.companyName
                        ? 'border-red-400 focus:ring-red-200 bg-red-50'
                        : 'border-gray-200 focus:ring-[#0D1637]/20 focus:border-[#0D1637] bg-white'
                      }`}
                  />
                  {errors.companyName && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle size={11} />{errors.companyName}
                    </p>
                  )}
                </div>

                {/* VAT Number */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    VAT Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3000000000"
                    value={form.vatNumber}
                    onChange={e => setField('vatNumber')(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors
                      ${errors.vatNumber
                        ? 'border-red-400 focus:ring-red-200 bg-red-50'
                        : 'border-gray-200 focus:ring-[#0D1637]/20 focus:border-[#0D1637] bg-white'
                      }`}
                  />
                  {errors.vatNumber && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle size={11} />{errors.vatNumber}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Street address, City, Country"
                    value={form.address}
                    onChange={e => setField('address')(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 transition-colors
                      ${errors.address
                        ? 'border-red-400 focus:ring-red-200 bg-red-50'
                        : 'border-gray-200 focus:ring-[#0D1637]/20 focus:border-[#0D1637] bg-white'
                      }`}
                  />
                  {errors.address && (
                    <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                      <AlertCircle size={11} />{errors.address}
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0 space-y-2">
            <button
              type="submit"
              form="quotation-form"
              disabled={submitting}
              className="w-full bg-[#F97316] hover:bg-[#e8650a] text-white font-semibold py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {submitting ? 'Generating PDF…' : 'Generate PDF'}
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-2xl transition-colors text-sm"
            >
              Continue Shopping
            </button>
          </div>
        )}

        {items.length === 0 && (
          <div className="px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={closeDrawer}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-2xl transition-colors text-sm"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
