'use client';

import React from 'react';
import Link from 'next/link';
import { Eye, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderStatusBadge from './OrderStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import type { Order, Pagination } from './types';

interface Props {
  orders: Order[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

function formatCurrency(value: number | string, locale: string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(isNaN(num) ? 0 : num);
}

function formatDate(dateStr: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function OrdersTable({ orders, loading, pagination, onPageChange }: Props) {
  const { t, isRTL, locale } = useLanguage();

  const columns = [
    t('orderID'),
    t('customer'),
    t('productsLabel'),
    t('orderTotal'),
    t('paymentStatus'),
    t('orderStatus'),
    t('actions'),
  ];

  const skeletonRows = Array.from({ length: 6 });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col}
                  className={`px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                    col === t('actions')
                      ? isRTL
                        ? 'text-left'
                        : 'text-right'
                      : isRTL
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              skeletonRows.map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((c) => (
                    <td key={c} className="px-5 py-4">
                      <div className="h-8 bg-gray-100 rounded-lg" />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Package size={40} className="text-gray-200" />
                    <p className="text-gray-400 font-semibold text-sm">
                      {t('noOrdersFound')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Order ID */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-800 tracking-tight">
                        #{order.orderNumber}
                      </span>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {formatDate(order.createdAt, locale)}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-[#5B5FC7]/10 flex items-center justify-center text-[#5B5FC7] text-xs font-black flex-shrink-0">
                        {(order.customerName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">
                          {order.customerName || '—'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {order.users?.email || '—'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Items count */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Package size={13} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-600">
                        {order._count?.orderItems ?? order.orderItems?.length ?? 0}
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-800">
                    {formatCurrency(order.total, locale)}
                  </td>

                  {/* Payment status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </td>

                  {/* Order status */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <OrderStatusBadge status={order.status} />
                  </td>

                  {/* Actions */}
                  <td className={`px-5 py-4 whitespace-nowrap ${isRTL ? 'text-left' : 'text-right'}`}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#5B5FC7] hover:bg-[#5B5FC7]/10 rounded-lg transition-colors"
                      title={t('viewOrder')}
                    >
                      <Eye size={14} />
                      {t('viewOrder')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <UnifiedPagination
        page={pagination.page}
        totalPages={pagination.pages}
        totalItems={pagination.total}
        onPageChange={onPageChange}
        isRTL={isRTL}
        labels={{
          total: t('total'),
          results: t('results'),
          previous: t('prevPage'),
          next: t('nextPage'),
        }}
      />
    </div>
  );
}
