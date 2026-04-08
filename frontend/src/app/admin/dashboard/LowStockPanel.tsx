'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LowStockProduct {
  id: string;
  translations: { name: string; locale: string }[];
  stock: number;
  minimumStockThreshold: number;
  brand?: { name: string };
  name?: string;
  nameEn?: string;
}

interface Props {
  items: LowStockProduct[];
  loading: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="rounded-2xl p-6 bg-gray-100 animate-pulse" style={{ minHeight: 96 }} aria-label="Loading" />
);

// ─── Low Stock Panel ──────────────────────────────────────────────────────────

export default function LowStockPanel({ items, loading }: Props) {
  const { t, isRTL } = useLanguage();

  if (loading) return <Skeleton />;

  /* ── All clear ── */
  if (items.length === 0) {
    return (
      <section aria-label={t('lowStockAlerts')}>
        <div
          className={`bg-[#F0FDF4] border-[#16A34A] rounded-2xl p-6 shadow-sm flex items-center gap-4 ${
            isRTL ? 'border-r-[6px]' : 'border-l-[6px]'
          }`}
        >
          <div className="bg-[#16A34A] p-2 rounded-lg text-white flex-shrink-0">
            <CheckCircle2 size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{t('healthyInventory')}</h2>
            <p className="text-gray-600 text-sm">{t('healthyInventoryMsg')}</p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Alerts ── */
  return (
    <section aria-label={t('lowStockAlerts')}>
      <div
        className={`bg-red-50 border-red-500 rounded-2xl p-6 shadow-sm ${
          isRTL ? 'border-r-[6px]' : 'border-l-[6px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-[#DC2626] p-2 rounded-lg text-white flex-shrink-0">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">{t('lowStockAlerts')}</h2>
        </div>
        <p className="text-gray-600 text-sm mb-5">{t('lowStockMsg')}</p>

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {items.slice(0, 6).map((product) => {
            const name =
              product.nameEn ||
              product.translations?.find((tr) => tr.locale === 'en')?.name ||
              product.name ||
              product.translations?.[0]?.name ||
              '—';

            return (
              <div
                key={product.id}
                className="bg-white p-4 rounded-xl border border-red-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h4
                      className="font-bold line-clamp-1 text-gray-800 flex-1"
                      title={name}
                    >
                      {name}
                    </h4>
                    {product.stock <= 2 ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-[#DC2626]/10 text-[#B91C1C] border border-[#DC2626]/20 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                        {t('criticalBadge')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-[#FACC15]/15 text-[#8A6700] border border-[#FACC15]/30 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        {t('lowBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    {t('supplierLabel')}:{' '}
                    <span className="text-gray-700 font-medium">
                      {product.brand?.name || '—'}
                    </span>
                  </p>
                  <p className="text-sm font-semibold">
                    {t('stock')}:{' '}
                    <span className={product.stock <= 2 ? 'text-red-500' : 'text-yellow-700'}>
                      {product.stock} {t('stockUnits')}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer link — flips in RTL */}
        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <Link
            href="/admin/products?filter=lowstock"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:underline"
          >
            {isRTL && (
              <ArrowRight size={14} className="rotate-180" aria-hidden="true" />
            )}
            {t('manageInventory')}
            {!isRTL && <ArrowRight size={14} aria-hidden="true" />}
          </Link>
        </div>
      </div>
    </section>
  );
}
