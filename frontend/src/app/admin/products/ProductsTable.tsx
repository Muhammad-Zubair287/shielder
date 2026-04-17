'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, PackageSearch, Package, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import StockStatusBadge from './StockStatusBadge';
import { getImageUrl } from '@/utils/helpers';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const stockTone = (stock: number, threshold: number) => {
    if (stock <= 0) return 'bg-red-50 text-red-700 border-red-100';
    if (stock <= threshold) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  const cellAlign = isRTL ? 'text-right' : 'text-left';
  const actionsAlign = isRTL ? 'text-left' : 'text-right';

  return (
    <div ref={tableRef} className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* ── Header ── */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50/95 backdrop-blur">
              {/* Image */}
              <th className={`px-4 py-3.5 font-black text-[10px] text-gray-400 uppercase tracking-widest ${cellAlign} w-14`}>
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
                  className={`px-4 py-3.5 font-black text-[10px] text-gray-400 uppercase tracking-widest whitespace-nowrap ${cellAlign} ${
                    key === 'stockStatus' ? 'hidden md:table-cell' : ''
                  } ${key === 'subcategoryCol' ? 'hidden lg:table-cell' : ''}`}
                >
                  {t(key)}
                </th>
              ))}
              <th
                className={`px-4 py-3.5 font-black text-[10px] text-gray-400 uppercase tracking-widest ${actionsAlign}`}
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
              products.map((p, index) => (
                <tr
                  key={p.id}
                  className={`transition-colors hover:bg-[#5B5FC7]/[0.04] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {/* Image */}
                  <td className="px-4 py-3.5 align-top">
                    {p.mainImage ? (
                      <img
                        src={getImageUrl(p.mainImage) || ''}
                        alt={productName(p)}
                        className="h-11 w-11 rounded-xl border border-gray-100 object-cover shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5B5FC7]/10">
                        <Package size={16} className="text-[#5B5FC7]" aria-hidden />
                      </div>
                    )}
                  </td>

                  {/* Product Name */}
                  <td className={`px-4 py-3.5 align-top ${cellAlign}`}>
                    <p className="max-w-[220px] truncate text-sm font-bold text-gray-900" title={productName(p)}>
                      {productName(p)}
                    </p>
                    {p.sku && (
                      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        SKU: {p.sku}
                      </p>
                    )}
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? t('active') : t('inactive')}
                    </span>
                  </td>

                  {/* Category */}
                  <td className={`px-4 py-3.5 align-top ${cellAlign}`}>
                    <span className="inline-block max-w-[260px] whitespace-normal break-words rounded-full bg-[#5B5FC7]/10 px-2.5 py-1 text-xs font-semibold leading-5 text-[#5B5FC7]">
                      {categoryName(p)}
                    </span>
                  </td>

                  {/* Subcategory */}
                  <td className={`hidden px-4 py-3.5 align-top lg:table-cell ${cellAlign}`}>
                    <span className="block max-w-[300px] whitespace-normal break-words text-xs leading-5 text-gray-500">
                      {subcategoryName(p)}
                    </span>
                  </td>

                  {/* Price */}
                  <td className={`px-4 py-3.5 align-top ${cellAlign} whitespace-nowrap`}>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatPrice(p.price)}
                    </span>
                    <span className="ms-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t('sarCurrency')}</span>
                  </td>

                  {/* Stock */}
                  <td className={`px-4 py-3.5 align-top ${cellAlign}`}>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${stockTone(p.stock, p.minimumStockThreshold)}`}>
                      {p.stock}
                    </span>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {t('stockUnits')}
                    </p>
                  </td>

                  {/* Status badge */}
                  <td className={`hidden px-4 py-3.5 align-top md:table-cell ${cellAlign}`}>
                    <StockStatusBadge stock={p.stock} threshold={p.minimumStockThreshold} />
                  </td>

                  {/* Actions */}
                  <td className={`px-4 py-3.5 align-top ${actionsAlign}`}>
                    <div className={`relative flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => setOpenMenuId((current) => (current === p.id ? null : p.id))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-[#5B5FC7]/20 hover:bg-[#5B5FC7]/5 hover:text-[#5B5FC7]"
                        title={t('actions')}
                        aria-label={t('actions')}
                        aria-expanded={openMenuId === p.id}
                        aria-haspopup="menu"
                      >
                        <MoreVertical size={17} />
                      </button>

                      {openMenuId === p.id && (
                        <div
                          className={`absolute top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl ${isRTL ? 'left-0' : 'right-0'}`}
                          role="menu"
                        >
                          <button
                            onClick={() => {
                              onEdit(p);
                              setOpenMenuId(null);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                            role="menuitem"
                          >
                            <Edit2 size={16} />
                            {t('editProduct')}
                          </button>
                          <button
                            onClick={() => {
                              onDelete(p);
                              setOpenMenuId(null);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-red-50 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                            role="menuitem"
                          >
                            <Trash2 size={16} />
                            {t('deleteProduct')}
                          </button>
                        </div>
                      )}
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
        <UnifiedPagination
          page={pagination.page}
          totalPages={pagination.totalPages || pagination.pages || 1}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={onPageChange}
          isRTL={isRTL}
          labels={{
            showing: t('showing'),
            of: t('of'),
            results: t('results'),
            previous: t('previous'),
            next: t('next'),
          }}
        />
      )}
    </div>
  );
}
