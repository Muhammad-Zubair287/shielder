'use client';

import React from 'react';
import {
  Banknote,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ReportSummary } from './types';

interface Props {
  summary: ReportSummary;
  loading: boolean;
}

function formatCurrency(v: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatNumber(v: number, locale: string) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(v);
}

interface CardDef {
  labelKey: string;
  value: number;
  format: 'currency' | 'number';
  Icon: LucideIcon;
  color: string;
  bg: string;
  delta?: string;
}

export default function SummaryCards({ summary, loading }: Props) {
  const { t, isRTL, locale } = useLanguage();

  const cards: CardDef[] = [
    {
      labelKey: 'reportTotalRevenue',
      value: summary.totalRevenue,
      format: 'currency',
      Icon: Banknote,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      labelKey: 'reportTotalOrders',
      value: summary.totalOrders,
      format: 'number',
      Icon: ShoppingCart,
      color: 'text-[#5B5FC7]',
      bg: 'bg-[#5B5FC7]/10',
    },
    {
      labelKey: 'reportPendingOrders',
      value: summary.pendingOrders,
      format: 'number',
      Icon: Clock,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    },
    {
      labelKey: 'reportCompletedOrders',
      value: summary.completedOrders,
      format: 'number',
      Icon: CheckCircle2,
      color: 'text-green-700',
      bg: 'bg-green-50',
    },
    {
      labelKey: 'reportCancelledOrders',
      value: summary.cancelledOrders,
      format: 'number',
      Icon: XCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
    },
    {
      labelKey: 'reportLowStock',
      value: summary.lowStockCount,
      format: 'number',
      Icon: AlertTriangle,
      color: 'text-orange-700',
      bg: 'bg-orange-50',
    },
    {
      labelKey: 'reportTotalCustomers',
      value: summary.totalCustomers,
      format: 'number',
      Icon: Users,
      color: 'text-sky-700',
      bg: 'bg-sky-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map(({ labelKey, value, format, Icon, color, bg }) => (
        <div
          key={labelKey}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
        >
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={18} className={color} />
            </div>
            <TrendingUp size={12} className="text-gray-200" />
          </div>

          <div className={isRTL ? 'text-right' : ''}>
            {loading ? (
              <>
                <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse mb-1" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </>
            ) : (
              <>
                <p className="text-2xl font-black text-gray-900 leading-none">
                  {format === 'currency'
                    ? formatCurrency(value, locale)
                    : formatNumber(value, locale)}
                </p>
                <p className="text-xs text-gray-500 font-medium mt-1">{t(labelKey)}</p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
