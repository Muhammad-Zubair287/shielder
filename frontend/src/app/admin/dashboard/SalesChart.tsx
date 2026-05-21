'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatSAR, formatNum } from './KPICards';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MonthlyDataPoint {
  month: string;  // ISO date string or formatted label
  revenue?: number;
  orders?: number;
}

interface Props {
  data: MonthlyDataPoint[];
  loading: boolean;
}

// ─── Month label formatter ────────────────────────────────────────────────────

const formatMonthLabel = (raw: string, locale: string): string => {
  try {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      month: 'short',
      year: '2-digit',
    }).format(date);
  } catch {
    return raw;
  }
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ChartSkeleton = () => (
  <div className="flex-1 rounded-xl bg-gray-100 animate-pulse" aria-label="Loading chart" />
);

// ─── Sales Chart ──────────────────────────────────────────────────────────────

export default function SalesChart({ data, loading }: Props) {
  const { t, locale } = useLanguage();

  // Format month labels for display
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: formatMonthLabel(d.month, locale),
  }));

  return (
    <section
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-w-0"
      style={{ minHeight: 380 }}
      aria-label={t('salesGraph')}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-50 p-2 rounded-lg text-[#5B5FC7]">
          <TrendingUp size={20} aria-hidden="true" />
        </div>
        <h3 className="font-bold text-gray-800 text-lg">{t('salesGraph')}</h3>
      </div>

      {/* Chart body */}
      <div className="flex-1 h-[280px] w-full min-w-0">
        {loading ? (
          <ChartSkeleton />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {t('noDataAvailable') || 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="monthLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                yAxisId="revenue"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
                    style: 'currency',
                    currency: 'SAR',
                    notation: 'compact',
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
                width={72}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(v) =>
                  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-SA').format(Number(v))
                }
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: 12,
                }}
                formatter={(value: any, name: string | number | undefined) => [
                  name === 'revenue'
                    ? formatSAR(Number(value), locale)
                    : formatNum(Number(value), locale),
                  name === 'revenue' ? t('revenueLabel') : t('ordersLabel'),
                ]}
                labelFormatter={(label) => label}
              />
              <Legend
                formatter={(value) =>
                  value === 'revenue' ? t('revenueLabel') : t('ordersLabel')
                }
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                yAxisId="revenue"
                stroke="#5B5FC7"
                strokeWidth={3}
                dot={{ r: 4, fill: '#5B5FC7', strokeWidth: 2, stroke: '#FFF' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                yAxisId="orders"
                stroke="#FF6B35"
                strokeWidth={3}
                dot={{ r: 4, fill: '#FF6B35', strokeWidth: 2, stroke: '#FFF' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
