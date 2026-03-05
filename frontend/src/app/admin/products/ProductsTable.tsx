'use client';

import React from 'react';
import { Edit2, Trash2, ChevronLeft, ChevronRight, PackageSearch, Package } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import StockStatusBadge from './StockStatusBadge';
import { getImageUrl } from '@/utils/helpers';
import type { Product } from './types';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Props {
  products: Product[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

const SKELETON_ROWS = Array.from({ length: 8 });
// image + productName + category + subcategory + price + stock + status + actions
const COL_COUNT = 8;

export default function ProductsTable({
  products,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: Props) {
  const { t, isRTL, locale } = useLanguage();

  // ── Locale-aware display helpers ───────────────────────────────────────────
  const productName = (p: Product) =>
    locale === 'ar' && p.nameAr ? p.nameAr : p.nameEn || p.name || '—';

  const categoryName = (p: Product): string => {
    if (!p.category) return '—';
    if (locale === 'ar') {
      const ar = p.category.translations?.find((t) => t.locale === 'ar');
      if (ar?.name) return ar.name;
      if (p.category.nameAr) return p.category.nameAr;
    }
    const en = p.category.translations?.find((t) => t.locale === 'en');
    return en?.name || p.category.nameEn || '—';
  };

  const subcategoryName = (p: Product): string => {
    if (!p.subcategory) return '—';
    if (locale === 'ar') {
      const ar = p.subcategory.translations?.find((t) => t.locale === 'ar');
      if (ar?.name) return ar.name;
      if (p.subcategory.nameAr) return p.subcategory.nameAr;
    }
    const en = p.subcategory.translations?.find((t) => t.locale === 'en');
    return en?.name || p.subcategory.nameEn || '—';
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  const cellAlign = isRTL ? 'text-right' : 'text-left';
  const actionsAlign = isRTL ? 'text-left' : 'text-right';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* ── Header ── */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {/* Image */}
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${cellAlign} w-14`}>
                {t('imageCol')}
              </th>
              {[
                'productName',
                'categoryCol',
                'subcategoryCol',
                'priceCol',
                'stockCol',
                'stockStatus',
              ].map((key) => (
                <th
                  key={key}
                  className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap ${cellAlign} ${
                    key === 'stockStatus' ? 'hidden md:table-cell' : ''
                  } ${key === 'subcategoryCol' ? 'hidden lg:table-cell' : ''}`}
                >
                  {t(key)}
                </th>
              ))}
              <th
                className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${actionsAlign}`}
              >
                {t('actions')}
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              SKELETON_ROWS.map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: COL_COUNT }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 rounded-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="text-center py-16 text-gray-400">
                  <PackageSearch size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-sm">{t('noProducts')}</p>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Image */}
                  <td className="px-4 py-3">
                    {p.mainImage ? (
                      <img
                        src={getImageUrl(p.mainImage) || ''}
                        alt={productName(p)}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-100 shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#5B5FC7]/10 flex items-center justify-center">
                        <Package size={16} className="text-[#5B5FC7]" aria-hidden />
                      </div>
                    )}
                  </td>

                  {/* Product Name */}
                  <td className={`px-4 py-3.5 ${cellAlign}`}>
                    <p className="font-semibold text-gray-800 truncate max-w-[160px]">
                      {productName(p)}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>

                  {/* Category */}
                  <td className={`px-4 py-3.5 ${cellAlign}`}>
                    <span className="inline-flex items-center text-xs font-semibold text-[#5B5FC7] bg-[#5B5FC7]/10 px-2.5 py-1 rounded-full truncate max-w-[120px]">
                      {categoryName(p)}
                    </span>
                  </td>

                  {/* Subcategory */}
                  <td className={`px-4 py-3.5 hidden lg:table-cell ${cellAlign}`}>
                    <span className="text-xs text-gray-500 truncate max-w-[120px] block">
                      {subcategoryName(p)}
                    </span>
                  </td>

                  {/* Price */}
                  <td className={`px-4 py-3.5 ${cellAlign} whitespace-nowrap`}>
                    <span className="font-bold text-gray-800 text-sm">
                      {formatPrice(p.price)}
                    </span>
                    <span className="text-[10px] text-gray-400 ms-1">{t('sarCurrency')}</span>
                  </td>

                  {/* Stock */}
                  <td className={`px-4 py-3.5 ${cellAlign}`}>
                    <span className="font-bold text-gray-700">{p.stock}</span>
                    <span className="text-[10px] text-gray-400 ms-1">{t('stockUnits')}</span>
                  </td>

                  {/* Status badge */}
                  <td className={`px-4 py-3.5 hidden md:table-cell ${cellAlign}`}>
                    <StockStatusBadge stock={p.stock} threshold={p.minimumStockThreshold} />
                  </td>

                  {/* Actions */}
                  <td className={`px-4 py-3.5 ${actionsAlign}`}>
                    <div className={`flex items-center gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 rounded-lg transition-colors"
                        title={t('editProduct')}
                        aria-label={t('editProduct')}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDelete(p)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('deleteProduct')}
                        aria-label={t('deleteProduct')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {!loading && products.length > 0 && (
        <div
          className={`px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3 ${
            isRTL ? 'flex-row-reverse' : ''
          } justify-between`}
        >
          <p className="text-xs text-gray-400">
            {t('showing')}{' '}
            <span className="font-bold text-gray-700">
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            {t('of')}{' '}
            <span className="font-bold text-gray-700">{pagination.total}</span>{' '}
            {t('results')}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('previous')}
            >
              <PrevIcon size={16} />
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1)
              .filter(
                (n) =>
                  n === 1 ||
                  n === pagination.pages ||
                  Math.abs(n - pagination.page) <= 1
              )
              .reduce<(number | 'ellipsis')[]>((acc, n, idx, arr) => {
                if (idx > 0 && Number(arr[idx - 1]) < n - 1) acc.push('ellipsis');
                acc.push(n);
                return acc;
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => onPageChange(item as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      pagination.page === item
                        ? 'bg-[#5B5FC7] text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('next')}
            >
              <NextIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
