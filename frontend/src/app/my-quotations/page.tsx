'use client';
export const dynamic = 'force-dynamic';

/**
 * /my-quotations  –  Customer Quotations Page
 *
 * Shows all quotations created by admins and sent to customers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCcw,
  FileText,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import SARSymbol from '@/components/SARSymbol';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/store/auth.store';
import quotationService from '@/services/quotation.service';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  customerName: string;
  total: number;
  createdAt: string;
  expiryDate?: string;
  items?: Array<{ id: string; productName: string; quantity: number }>;
  convertedOrderId?: string;
  notes?: string;
  userMessage?: string | null;
  adminReply?: string | null;
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
  if (s === 'APPROVED' || s === 'CONVERTED') return 'bg-green-100 text-green-700';
  if (s === 'REPLIED')                     return 'bg-teal-100 text-teal-700';
  if (s === 'REJECTED')                     return 'bg-red-100 text-red-700';
  if (s === 'REVIEWED')                     return 'bg-blue-100 text-blue-700';
  if (s === 'EXPIRED')                      return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700'; // PENDING
}

function statusIcon(status: string) {
  const s = (status || '').toUpperCase();
  if (s === 'APPROVED') return <CheckCircle size={16} className="text-green-600" />;
  if (s === 'REPLIED') return <CheckCircle size={16} className="text-teal-600" />;
  if (s === 'REJECTED') return <XCircle size={16} className="text-red-600" />;
  if (s === 'EXPIRED')  return <AlertCircle size={16} className="text-red-600" />;
  if (s === 'CONVERTED') return <CheckCircle size={16} className="text-green-600" />;
  return <Clock size={16} className="text-yellow-600" />;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyQuotationsPage() {
  const { t, isRTL, locale } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // ── Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', '/my-quotations');
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotations = useCallback(async (page = 1) => {
    setRefreshing(true);
    try {
      const res = await quotationService.getMyQuotations({ page, limit: pagination.limit });
      setQuotations(res.data ?? []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error(t('myQuotations.loadError') || 'Failed to load quotations');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.limit, t]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchQuotations(1);
  }, [authLoading, isAuthenticated, fetchQuotations]);

  const handleConvertToOrder = useCallback(async (quotationId: string) => {
    setConvertingId(quotationId);
    try {
      const response = await quotationService.convertToOrder(quotationId);
      toast.success(t('myQuotations.convertedToOrder') || 'Quotation converted to order');
      // Redirect to the new order
      if (response?.data?.id) {
        router.push(`/order-confirmation/${response.data.id}`);
      } else {
        fetchQuotations(pagination.page);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('myQuotations.conversionError') || 'Failed to convert quotation');
    } finally {
      setConvertingId(null);
    }
  }, [router, fetchQuotations, pagination.page, t]);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-[#0205A6]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <LandingNavbar />

      <main className="flex-1 pt-[120px] pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="flex items-center mb-8 relative">
            <Link
              href="/products"
              className="p-2 text-gray-600 hover:text-[#0205A6] hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="back"
            >
              <BackArrow size={22} />
            </Link>
            <h1 className="absolute inset-x-0 text-center text-xl font-bold text-gray-900 pointer-events-none">
              {t('myQuotations.title') || 'My Quotations'}
            </h1>
            <button
              onClick={() => fetchQuotations(pagination.page)}
              disabled={refreshing}
              className="ms-auto text-gray-400 hover:text-[#0205A6] transition-colors disabled:opacity-40"
              aria-label="refresh"
            >
              <RefreshCcw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Empty state */}
          {quotations.length === 0 && !refreshing ? (
            <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center">
                <FileText size={36} className="text-[#0205A6]" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {t('myQuotations.empty') || 'You have no quotations yet.'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('myQuotations.emptySubtitle') || 'Request a quotation and admins will send you one here.'}
                </p>
              </div>
              <Link
                href="/generate-quotation"
                className="inline-flex items-center gap-2 bg-[#0205A6] hover:bg-[#0204c0] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-colors shadow-sm"
              >
                {t('myQuotations.requestQuotation') || 'Request Quotation'}
              </Link>
            </div>
          ) : (
            <>
              {/* Quotations list */}
              <div className="space-y-4">
                {quotations.map(quotation => {
                  const itemCount = quotation.items?.length ?? 0;
                  const status = (quotation.status || '').toUpperCase();
                  const isExpired = status === 'EXPIRED';
                  const canConvert = status === 'APPROVED' && !quotation.convertedOrderId;
                  let dateStr = '';
                  try { 
                    dateStr = format(new Date(quotation.createdAt), 'dd MMM yyyy'); 
                  } catch { 
                    dateStr = quotation.createdAt?.slice(0, 10) ?? ''; 
                  }

                  let expiryStr = '';
                  if (quotation.expiryDate) {
                    try {
                      expiryStr = format(new Date(quotation.expiryDate), 'dd MMM yyyy');
                    } catch {
                      expiryStr = quotation.expiryDate?.slice(0, 10) ?? '';
                    }
                  }

                  return (
                    <div
                      key={quotation.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:border-orange-200 transition-colors"
                    >
                      {/* Top row */}
                      <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={isRTL ? 'text-right' : 'text-start'}>
                          <p className="text-xs text-gray-500">
                            {t('myQuotations.quotationNumber') || 'Quotation'}
                          </p>
                          <p className="text-sm font-bold text-gray-900 tracking-wide">
                            #{quotation.quotationNumber}
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(quotation.status)}`}>
                            {statusIcon(quotation.status)}
                            {t(`myQuotations.status.${quotation.status?.toLowerCase()}`) || quotation.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle row */}
                      <div className={`px-5 py-3 border-b border-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {quotation.notes && (
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold text-gray-700">{t('myQuotations.notes') || 'Notes'}:</span> {quotation.notes.substring(0, 100)}
                            {quotation.notes.length > 100 ? '...' : ''}
                          </p>
                        )}
                        {quotation.adminReply && (
                          <p className="text-sm text-teal-700 mb-2">
                            <span className="font-semibold text-teal-800">{t('myQuotations.adminReply')}:</span> {quotation.adminReply.substring(0, 100)}
                            {quotation.adminReply.length > 100 ? '...' : ''}
                          </p>
                        )}
                        <div className={`flex items-center justify-between text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="flex items-center gap-1">
                            <FileText size={14} />
                            {itemCount} {t('myQuotations.items') || 'Items'}
                          </span>
                          <span>{dateStr}</span>
                          {expiryStr && (
                            <span className={`text-xs ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {t('myQuotations.expiresOn') || 'Expires'}: {expiryStr}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className={`flex items-center justify-between px-5 py-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="font-bold text-[#0D1637] text-sm flex items-center gap-0.5">
                          <SARSymbol />{Number(quotation.total).toFixed(2)}
                        </span>
                        <Link
                          href={`/my-quotation/${quotation.id}`}
                          className="inline-flex items-center gap-1 text-[#0205A6] hover:text-[#0204c0] text-sm font-semibold transition-colors"
                        >
                          {t('myQuotations.viewDetails') || 'View'}
                          <ChevronRight size={14} className={isRTL ? 'rotate-180' : ''} />
                        </Link>
                      </div>

                      {/* Quick actions */}
                      <div className={`px-5 pb-4 flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Link
                          href={`/my-quotation/${quotation.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-[#0205A6] hover:text-[#0205A6] text-xs font-semibold transition-colors"
                        >
                          <FileText size={13} />
                          {t('myQuotations.viewDetails') || 'View'}
                        </Link>

                        {canConvert && (
                          <button
                            type="button"
                            onClick={() => handleConvertToOrder(quotation.id)}
                            disabled={convertingId === quotation.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <ShoppingBag size={13} className={convertingId === quotation.id ? 'animate-spin' : ''} />
                            {t('myQuotations.convertToOrder') || 'Convert to Order'}
                          </button>
                        )}

                        {quotation.convertedOrderId && (
                          <Link
                            href={`/order-confirmation/${quotation.convertedOrderId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold transition-colors"
                          >
                            <CheckCircle size={13} />
                            {t('myQuotations.viewOrder') || 'View Order'}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-8">
                  <UnifiedPagination
                    page={pagination.page}
                    totalPages={pagination.pages}
                    totalItems={pagination.total}
                    pageSize={pagination.limit}
                    onPageChange={fetchQuotations}
                    isRTL={isRTL}
                    labels={{
                      showing: 'Showing',
                      of: 'of',
                      results: 'quotations',
                      previous: 'Previous',
                      next: 'Next',
                    }}
                  />
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
