'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Layers, TrendingUp, ShoppingCart, FileText, Activity, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KPIData {
  totalProducts: number;
  totalStock: number;
  inventoryValue: number;
  totalRevenue: number;
  totalCategories: number;
  totalQuotations: number;
}

interface Props {
  data: KPIData | null;
  loading: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Always formats as SAR regardless of selected language */
export const formatSAR = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatNum = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value);

// ─── Single Card ─────────────────────────────────────────────────────────────

const KPICard = ({
  label,
  value,
  icon: Icon,
  href,
  chip,
  gradientClass,
  chipClass,
  detailsLabel,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  href: string;
  chip: string;
  gradientClass: string;
  chipClass: string;
  detailsLabel: string;
  loading: boolean;
}) => (
  <Link href={href} className="block group" role="listitem" aria-label={label}>
    <div className={`rounded-2xl p-5 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-lg bg-gradient-to-br ${gradientClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white/80 text-[11px] font-black uppercase tracking-[0.18em] leading-tight break-words">
            {label}
          </p>
          {loading ? (
            <div className="h-7 w-20 bg-white/20 rounded-lg mt-2 animate-pulse" aria-label="Loading" />
          ) : (
            <h3 className="text-white text-[28px] leading-[1.1] font-black mt-2 break-words">{value}</h3>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icon size={22} className="text-white" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className={`px-2.5 py-1 rounded-full font-semibold ${chipClass}`}>{chip}</span>
        <span className="inline-flex items-center gap-1 text-white/90 font-semibold">
          {detailsLabel}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </Link>
);

// ─── KPI Cards Grid ───────────────────────────────────────────────────────────

export default function KPICards({ data, loading }: Props) {
  const { t, locale } = useLanguage();

  const cardStyles = [
    { gradientClass: 'from-indigo-600 to-indigo-500', chipClass: 'bg-indigo-200/30 text-indigo-100' },
    { gradientClass: 'from-slate-700 to-slate-600', chipClass: 'bg-slate-200/20 text-slate-100' },
    { gradientClass: 'from-amber-600 to-orange-500', chipClass: 'bg-orange-200/25 text-orange-100' },
    { gradientClass: 'from-emerald-600 to-green-500', chipClass: 'bg-emerald-200/30 text-emerald-100' },
    { gradientClass: 'from-cyan-600 to-sky-500', chipClass: 'bg-cyan-200/30 text-cyan-100' },
    { gradientClass: 'from-rose-600 to-rose-500', chipClass: 'bg-rose-200/30 text-rose-100' },
  ];

  const cards = [
    {
      label: t('totalProducts'),
      value: formatNum(data?.totalProducts ?? 0, locale),
      icon: Package,
      href: '/admin/products',
      chip: t('drilldownLabelProducts'),
    },
    {
      label: t('totalStock'),
      value: formatNum(data?.totalStock ?? 0, locale),
      icon: Layers,
      href: '/admin/products?tab=inventory',
      chip: t('drilldownLabelStock'),
    },
    {
      label: t('inventoryValue'),
      value: formatSAR(data?.inventoryValue ?? 0, locale),
      icon: TrendingUp,
      href: '/admin/reports',
      chip: t('drilldownLabelValue'),
    },
    {
      label: t('totalRevenue'),
      value: formatSAR(data?.totalRevenue ?? 0, locale),
      icon: ShoppingCart,
      href: '/admin/reports?tab=revenue',
      chip: t('drilldownLabelRevenue'),
    },
    {
      label: t('totalCategories'),
      value: formatNum(data?.totalCategories ?? 0, locale),
      icon: Activity,
      href: '/admin/categories',
      chip: t('drilldownLabelCategories'),
    },
    {
      label: t('totalQuotations'),
      value: formatNum(data?.totalQuotations ?? 0, locale),
      icon: FileText,
      href: '/admin/quotations',
      chip: t('drilldownLabelQuotations') || t('totalQuotations'),
    },
  ];

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4"
      role="list"
      aria-label={t('adminDashboard')}
    >
      {cards.map((card, index) => (
        <KPICard
          key={card.label}
          {...card}
          {...cardStyles[index % cardStyles.length]}
          detailsLabel={t('kpiDetails')}
          loading={loading}
        />
      ))}
    </div>
  );
}
