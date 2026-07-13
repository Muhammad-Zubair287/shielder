'use client';

/**
 * /my-quotation/[id]
 *
 * Quotation preview page — shows full quotation details,
 * product list, totals, and a Download PDF button.
 * Fully RTL-aware and mobile-responsive.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import SARSymbol from '@/components/SARSymbol';
import { getImageUrl } from '@/utils/helpers';
import {
  ArrowLeft, ArrowRight, Download, FileText,
  Building2, MapPin, Hash, Calendar, CheckCircle2, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import customerQuotationService, { QuotationResult } from '@/services/customerQuotation.service';
import { useSyncRefetch } from '@/hooks/useSyncRefetch';

const PLACEHOLDER = '/images/landing/factory-1.png';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-gray-200" />
        <div className="p-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-14 h-14 bg-gray-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-20 shrink-0" />
            </div>
          ))}
          <div className="h-24 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── Detail Badge ──────────────────────────────────────────────────────────────

function Detail({ icon: Icon, label, value, isRTL }: {
  icon: React.ElementType; label: string; value: string; isRTL: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Icon + label — fixed width, never shrinks */}
      <div className={`flex items-center gap-2 shrink-0 w-36 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
        <div className="w-6 h-6 rounded-md bg-[#0D1637]/10 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-[#0D1637]" />
        </div>
        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">{label}</span>
      </div>
      {/* Value — takes remaining width, wraps on long text */}
      <p className={`flex-1 text-sm font-semibold text-gray-900 break-words ${isRTL ? 'text-right' : 'text-start'}`}>
        {value}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyQuotationPage() {
  const { t, isRTL } = useLanguage();
  const params = useParams();
  const id = params?.id as string;

  const [quotation, setQuotation] = useState<QuotationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // ── Load quotation ──────────────────────────────────────────────────────────

  const loadQuotation = useCallback(async () => {
    if (!id) return;
    try {
      const data = await customerQuotationService.getById(id);
      setQuotation(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadQuotation(); }, [loadQuotation]);

  useSyncRefetch(loadQuotation, 'quotations');

  // ── Download PDF ────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    if (!quotation) return;
    setDownloading(true);
    try {
      await customerQuotationService.downloadPDF(
        quotation.id,
        `quotation-${quotation.quotationNumber}.pdf`,
      );
    } catch {
      toast.error(t('quot.serverError'));
    } finally {
      setDownloading(false);
    }
  };

  const canRespondToQuotation =
    quotation?.status === 'SENT' || quotation?.status === 'VIEWED';

  const handleAccept = async () => {
    if (!quotation || !canRespondToQuotation) return;
    setActionLoading('accept');
    try {
      const updated = await customerQuotationService.accept(quotation.id);
      setQuotation((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(t('quot.acceptSuccess'));
    } catch {
      toast.error(t('quot.actionError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!quotation || !canRespondToQuotation) return;
    const reason = window.prompt(t('quot.rejectReasonPrompt')) || '';

    setActionLoading('reject');
    try {
      const updated = await customerQuotationService.reject(quotation.id, reason);
      setQuotation((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(t('quot.rejectSuccess'));
    } catch {
      toast.error(t('quot.actionError'));
    } finally {
      setActionLoading(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const fmt = (n: number | string | undefined) => (
    <span className="inline-flex items-center gap-0.5"><SARSymbol />{Number(n ?? 0).toFixed(2)}</span>
  );

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-GB');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-24 sm:pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Back → My Quotations — no flex-row-reverse: dir="rtl" on page naturally puts arrow (1st) on right */}
          <Link
            href="/my-quotations"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0D1637] mb-6 transition-colors"
          >
            <BackArrow size={16} />
            {t('back')}
          </Link>

          {loading && <Skeleton />}

          {!loading && error && (
            <div className="text-center py-20">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-bold text-gray-700">{t('quot.notFound')}</p>
              <Link href="/my-quotations" className="mt-4 inline-block text-[#0205A6] text-sm font-semibold hover:underline">
                {t('back')}
              </Link>
            </div>
          )}

          {!loading && !error && quotation && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

              {/* ── Header band ───────────────────────────────────────────── */}
              <div className={`bg-[#0D1637] px-8 py-6 flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#0205A6] flex items-center justify-center">
                      <FileText size={16} className="text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-white">{t('quot.previewTitle')}</h1>
                  </div>
                  {/* dir="ltr" keeps # and digits together regardless of page direction */}
                  <p className={`text-sm text-[#0205A6] font-bold ${isRTL ? 'text-right' : ''}`}>
                    <span dir="ltr" className="inline-block">#{quotation.quotationNumber}</span>
                  </p>
                  <p className={`text-xs text-white/80 mt-1 ${isRTL ? 'text-right' : ''}`}>
                    {t('quot.statusLabel')}: {t(`myQuotations.status.${quotation.status?.toLowerCase()}`) || quotation.status}
                  </p>
                </div>

                {/* Download button */}
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className={`shrink-0 flex items-center gap-2 bg-[#0205A6] hover:bg-[#0204c0] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Download size={15} />
                  {downloading ? t('quot.downloadingPDF') : t('quot.downloadPDF')}
                </button>
              </div>

              {/* ── Meta info ────────────────────────────────────────────── */}
              <div className="px-8 py-3 border-b border-gray-100">
                <Detail icon={Building2} label={t('quot.companyLabel')} value={quotation.companyName || '—'} isRTL={isRTL} />
                <Detail icon={Hash}      label={t('quot.vatLabel')}     value={quotation.vatNumber || '—'} isRTL={isRTL} />
                <Detail icon={Calendar}  label={t('quot.date')}         value={fmtDate(quotation.quotationDate)} isRTL={isRTL} />
                <Detail icon={Calendar}  label={t('quot.validUntil')}   value={fmtDate(quotation.expiryDate)} isRTL={isRTL} />
                <Detail icon={MapPin}    label={t('quot.addressLabel')} value={quotation.customerAddress || '—'} isRTL={isRTL} />
              </div>

              {(quotation.userMessage || quotation.adminReply) && (
                <div className="px-8 py-4 border-b border-gray-100 space-y-3">
                  {quotation.userMessage && (
                    <div className={`rounded-xl border border-gray-100 bg-gray-50 p-3 ${isRTL ? 'text-right' : 'text-start'}`}>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('quot.yourMessage')}</p>
                      <p className="mt-1 text-sm text-gray-700">{quotation.userMessage}</p>
                    </div>
                  )}
                  {quotation.adminReply && (
                    <div className={`rounded-xl border border-emerald-100 bg-emerald-50 p-3 ${isRTL ? 'text-right' : 'text-start'}`}>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">{t('quot.adminReply')}</p>
                      <p className="mt-1 text-sm text-emerald-800">{quotation.adminReply}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Product table ─────────────────────────────────────────── */}
              <div className="px-8 py-5">

                {canRespondToQuotation && (
                  <div className={`mb-5 flex items-center gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading !== null}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <XCircle size={16} />
                      {actionLoading === 'reject' ? t('quot.processingAction') : t('quot.rejectQuotation')}
                    </button>

                    <button
                      onClick={handleAccept}
                      disabled={actionLoading !== null}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <CheckCircle2 size={16} />
                      {actionLoading === 'accept' ? t('quot.processingAction') : t('quot.acceptQuotation')}
                    </button>
                  </div>
                )}

                {/* Table header */}
                <div className={`hidden sm:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : ''}`}>
                  <span className="col-span-5">{t('quot.product')}</span>
                  <span className="col-span-2 text-center">{t('quot.qty')}</span>
                  <span className={`col-span-2 ${isRTL ? 'text-start' : 'text-right'}`}>{t('quot.unitPrice')}</span>
                  <span className={`col-span-3 ${isRTL ? 'text-start' : 'text-right'}`}>{t('quot.lineTotal')}</span>
                </div>
                <hr className="hidden sm:block border-gray-100 mb-4" />

                {/* Rows */}
                <div className="space-y-0 divide-y divide-gray-50">
                  {quotation.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 gap-2 items-center py-4 ${isRTL ? 'text-right' : ''}`}
                    >
                      {/* Product info — dir="rtl" on parent handles image/text order */}
                      <div className="col-span-12 sm:col-span-5 flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          <Image
                            src={getImageUrl(item.thumbnail) ?? PLACEHOLDER}
                            alt={item.productName}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.productName}</p>
                        </div>
                      </div>

                      {/* Qty  */}
                      <div className="col-span-4 sm:col-span-2 text-sm text-gray-600 text-center">
                        {item.quantity}
                      </div>

                      {/* Unit price */}
                      <div className={`col-span-4 sm:col-span-2 text-sm text-gray-700 font-medium ${isRTL ? 'text-start' : 'text-right'}`}>
                        {fmt(item.unitPrice)}
                      </div>

                      {/* Line total */}
                      <div className={`col-span-4 sm:col-span-3 text-sm font-bold text-[#0D1637] ${isRTL ? 'text-start' : 'text-right'}`}>
                        {fmt(item.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Totals ──────────────────────────────────────────────── */}
                {/* justify-end (LTR) / justify-start (RTL) both push the block to the right edge */}
                <div className={`mt-5 pt-5 border-t border-gray-100 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                  <div className="flex flex-col gap-2">

                    {/* Subtotal — dir="rtl" on page puts label (1st) RIGHT, amount (2nd) LEFT */}
                    <div className="flex gap-16 text-sm text-gray-600">
                      <span className={`w-28 ${isRTL ? 'text-start' : 'text-right'}`}>{t('quot.subtotal')}</span>
                      <span className="font-semibold text-gray-900">{fmt(quotation.subtotal)}</span>
                    </div>

                    {/* Shipping */}
                    <div className="flex gap-16 text-sm text-gray-600">
                      <span className={`w-28 ${isRTL ? 'text-start' : 'text-right'}`}>{t('quot.shipping')}</span>
                      <span className="font-semibold text-gray-900">{t('quot.free')}</span>
                    </div>

                    {/* Dashed */}
                    <div className="w-56 border-t border-dashed border-gray-300 my-1" />

                    {/* Total */}
                    <div className="flex gap-16 text-base">
                      <span className={`w-28 font-bold text-gray-900 ${isRTL ? 'text-start' : 'text-right'}`}>{t('quot.total')}</span>
                      <span className="font-bold text-[#0D1637] text-lg">{fmt(quotation.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile sticky download */}
      {!loading && !error && quotation && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-30 shadow-lg">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full flex items-center justify-center gap-2 bg-[#0205A6] hover:bg-[#0204c0] text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download size={18} />
            {downloading ? t('quot.downloadingPDF') : t('quot.downloadPDF')}
          </button>
        </div>
      )}

      <LandingFooter />
    </div>
  );
}
