'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, Shapes, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/helpers';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import type { Subcategory } from './types';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  totalPages?: number;
}

interface Props {
  subcategories: Subcategory[];
  loading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onEdit: (s: Subcategory) => void;
  onDelete: (s: Subcategory) => void;
}

export default function SubcategoriesTable({
  subcategories,
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

  const displayName = (s: Subcategory) =>
    locale === 'ar' && s.nameAr ? s.nameAr : s.nameEn || s.name;

  const displayDesc = (s: Subcategory) =>
    locale === 'ar' && s.descriptionAr ? s.descriptionAr : s.descriptionEn || s.description || '—';

  const displayCategoryName = (s: Subcategory): string => {
    if (locale === 'ar') {
      // try category.translations first, then flattened categoryName
      const arTrans = s.category?.translations?.find((t: any) => t.locale === 'ar');
      if (arTrans?.name) return arTrans.name;
    }
    const enTrans = s.category?.translations?.find((t: any) => t.locale === 'en');
    return enTrans?.name || s.categoryName || '—';
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(d));

  const SKELETONS = Array.from({ length: 6 });

  return (
    <div ref={tableRef} className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50/95 backdrop-blur">
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} w-12`}>
                {t('imageCol')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('subcategoryNameLabel')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('parentCategory')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} hidden md:table-cell`}>
                {t('categoryDescription')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} hidden sm:table-cell`}>
                {t('proCount')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'} hidden lg:table-cell`}>
                {t('createdAt')}
              </th>
              <th className={`px-4 py-3 font-black text-[10px] text-gray-400 uppercase tracking-widest ${isRTL ? 'text-left' : 'text-right'}`}>
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? SKELETONS.map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-gray-100 rounded-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : subcategories.length === 0
              ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      <Shapes size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-semibold text-sm">{t('noSubcategories')}</p>
                    </td>
                  </tr>
                )
              : subcategories.map((s, index) => (
                  <tr key={s.id} className={`transition-colors hover:bg-[#5B5FC7]/[0.04] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    {/* Icon / Image */}
                    <td className="px-4 py-3.5 align-top">
                      {s.image ? (
                        <img
                          src={getImageUrl(s.image) || ''}
                          alt={displayName(s)}
                          className="h-10 w-10 rounded-xl border border-gray-100 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5B5FC7]/10">
                          <Shapes size={16} className="text-[#5B5FC7]" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className={`px-4 py-3.5 align-top ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="max-w-[220px] truncate text-sm font-bold text-gray-900" title={displayName(s)}>{displayName(s)}</p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {s.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>

                    {/* Parent Category */}
                    <td className={`px-4 py-3.5 align-top ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-block max-w-[280px] whitespace-normal break-words rounded-full bg-[#5B5FC7]/10 px-2.5 py-1 text-xs font-semibold leading-5 text-[#5B5FC7]">
                        {displayCategoryName(s)}
                      </span>
                    </td>

                    {/* Description */}
                    <td className={`hidden px-4 py-3.5 align-top text-gray-500 md:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="max-w-[220px] truncate text-xs leading-5">{displayDesc(s)}</p>
                    </td>

                    {/* Product count */}
                    <td className={`hidden px-4 py-3.5 align-top sm:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {s._count?.products ?? 0}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className={`hidden px-4 py-3.5 align-top whitespace-nowrap text-gray-500 lg:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatDate(s.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className={`px-4 py-3.5 align-top ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className={`relative flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        <button
                          onClick={() => setOpenMenuId((current) => (current === s.id ? null : s.id))}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-[#5B5FC7]/20 hover:bg-[#5B5FC7]/5 hover:text-[#5B5FC7]"
                          title={t('actions')}
                          aria-label={t('actions')}
                          aria-expanded={openMenuId === s.id}
                          aria-haspopup="menu"
                        >
                          <MoreVertical size={17} />
                        </button>

                        {openMenuId === s.id && (
                          <div
                            className={`absolute top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl ${isRTL ? 'left-0' : 'right-0'}`}
                            role="menu"
                          >
                            <button
                              onClick={() => {
                                onEdit(s);
                                setOpenMenuId(null);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                              role="menuitem"
                            >
                              <Edit2 size={16} />
                              {t('editSubcategory')}
                            </button>
                            <button
                              onClick={() => {
                                onDelete(s);
                                setOpenMenuId(null);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-red-50 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                              role="menuitem"
                            >
                              <Trash2 size={16} />
                              {t('deleteSubcategory')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <UnifiedPagination
          page={pagination.page}
          totalPages={pagination.totalPages || pagination.pages || 1}
          totalItems={pagination.total}
          onPageChange={onPageChange}
          isRTL={isRTL}
          labels={{
            total: t('total'),
            results: t('results'),
            previous: t('previous'),
            next: t('next'),
          }}
        />
      )}
    </div>
  );
}
