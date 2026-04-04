'use client';

import React from 'react';
import { Edit2, Trash2, Shapes } from 'lucide-react';
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
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
              : subcategories.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    {/* Icon / Image */}
                    <td className="px-4 py-3.5">
                      {s.image ? (
                        <img
                          src={getImageUrl(s.image) || ''}
                          alt={displayName(s)}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#5B5FC7]/10 flex items-center justify-center">
                          <Shapes size={16} className="text-[#5B5FC7]" />
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className={`px-4 py-3.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-semibold text-gray-800 truncate max-w-[140px]">{displayName(s)}</p>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                          s.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {s.isActive ? t('active') : t('inactive')}
                      </span>
                    </td>

                    {/* Parent Category */}
                    <td className={`px-4 py-3.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5B5FC7] bg-[#5B5FC7]/10 px-2.5 py-1 rounded-full truncate max-w-[120px]">
                        {displayCategoryName(s)}
                      </span>
                    </td>

                    {/* Description */}
                    <td className={`px-4 py-3.5 hidden md:table-cell text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="truncate max-w-[180px]">{displayDesc(s)}</p>
                    </td>

                    {/* Product count */}
                    <td className={`px-4 py-3.5 hidden sm:table-cell ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                        {s._count?.products ?? 0}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className={`px-4 py-3.5 hidden lg:table-cell text-gray-500 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatDate(s.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className={`px-4 py-3.5 ${isRTL ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center gap-1 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        <button
                          onClick={() => onEdit(s)}
                          className="p-1.5 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 rounded-lg transition-colors"
                          title={t('editSubcategory')}
                          aria-label={t('editSubcategory')}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(s)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('deleteSubcategory')}
                          aria-label={t('deleteSubcategory')}
                        >
                          <Trash2 size={15} />
                        </button>
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
