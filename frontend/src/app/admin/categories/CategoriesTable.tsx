'use client';

import React from 'react';
import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/helpers';
import UnifiedPagination from '@/components/ui/UnifiedPagination';
import type { Category } from './types';

interface Props {
  categories: Category[];
  loading: boolean;
  pagination: { page: number; pages: number; total: number };
  onPageChange: (page: number) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
        isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-red-500'}`}
      />
      {isActive ? t('active') : t('inactive')}
    </span>
  );
};

const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-100 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

export default function CategoriesTable({
  categories,
  loading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: Props) {
  const { t, locale, isRTL } = useLanguage();

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));

  // Display category name based on selected language
  const displayName = (cat: Category) =>
    (locale === 'ar' && cat.nameAr) ? cat.nameAr : (cat.nameEn || cat.name);

  const displayDesc = (cat: Category) =>
    (locale === 'ar' && cat.descriptionAr) ? cat.descriptionAr : (cat.descriptionEn || cat.description);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {[
                { key: 'imageCol', align: 'text-center' },
                { key: 'categoryName', align: '' },
                { key: 'categoryDescription', align: '' },
                { key: 'dataCol', align: 'text-center' },
                { key: 'status', align: '' },
                { key: 'createdAt', align: '' },
                { key: 'actions', align: isRTL ? 'text-start' : 'text-end' },
              ].map(({ key, align }) => (
                <th
                  key={key}
                  className={`px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest ${align}`}
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-gray-400 text-sm italic">
                  {t('noCategories')}
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors group">
                  {/* Image */}
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                        {cat.image ? (
                          <img
                            src={getImageUrl(cat.image) || ''}
                            alt={displayName(cat)}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/landing/factory-1.png'; }}
                          />
                        ) : (
                          <ImageIcon className="text-gray-300" size={20} />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800">{displayName(cat)}</span>
                  </td>

                  {/* Description */}
                  <td className="px-6 py-4 max-w-[200px]">
                    <p className="text-xs text-gray-500 truncate">{displayDesc(cat)}</p>
                  </td>

                  {/* Counts */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {t('subCount')}: {cat._count.subcategories}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {t('proCount')}: {cat._count.products}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge isActive={cat.isActive} />
                  </td>

                  {/* Created */}
                  <td className="px-6 py-4 text-[11px] text-gray-500 font-medium">
                    {formatDate(cat.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => onEdit(cat)}
                        className="p-2 text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5 rounded-lg transition-all"
                        title={t('edit')}
                        aria-label={t('edit')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(cat)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title={t('delete')}
                        aria-label={t('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
        totalPages={pagination.pages || 1}
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
    </div>
  );
}
