'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, Image as ImageIcon, MoreVertical } from 'lucide-react';
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
      ref={tableRef}
      className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50/95 backdrop-blur">
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
              categories.map((cat, index) => (
                <tr key={cat.id} className={`transition-colors group hover:bg-[#5B5FC7]/[0.04] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  {/* Image */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
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
                  <td className="px-6 py-4 align-top">
                    <span className="block max-w-[220px] truncate text-sm font-bold text-gray-900" title={displayName(cat)}>{displayName(cat)}</span>
                  </td>

                  {/* Description */}
                  <td className="max-w-[220px] px-6 py-4 align-top">
                    <p className="truncate text-xs leading-5 text-gray-500">{displayDesc(cat)}</p>
                  </td>

                  {/* Counts */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex justify-center">
                      <div className={`inline-flex items-stretch gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="min-w-[74px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('subCount')}</p>
                          <p className="mt-0.5 text-base font-black leading-none text-slate-700">{cat._count.subcategories}</p>
                        </div>
                        <div className="min-w-[74px] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('proCount')}</p>
                          <p className="mt-0.5 text-base font-black leading-none text-slate-700">{cat._count.products}</p>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 align-top">
                    <StatusBadge isActive={cat.isActive} />
                  </td>

                  {/* Created */}
                  <td className="px-6 py-4 align-top text-[11px] font-medium text-gray-500">
                    {formatDate(cat.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 align-top">
                    <div className={`relative flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={() => setOpenMenuId((current) => (current === cat.id ? null : cat.id))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-all hover:border-[#5B5FC7]/20 hover:bg-[#5B5FC7]/5 hover:text-[#5B5FC7]"
                        title={t('actions')}
                        aria-label={t('actions')}
                        aria-expanded={openMenuId === cat.id}
                        aria-haspopup="menu"
                      >
                        <MoreVertical size={17} />
                      </button>

                      {openMenuId === cat.id && (
                        <div
                          className={`absolute top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1 shadow-xl ${isRTL ? 'left-0' : 'right-0'}`}
                          role="menu"
                        >
                          <button
                            onClick={() => {
                              onEdit(cat);
                              setOpenMenuId(null);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-[#FF6B35]/5 hover:text-[#FF6B35] ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                            role="menuitem"
                          >
                            <Edit2 size={16} />
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => {
                              onDelete(cat);
                              setOpenMenuId(null);
                            }}
                            className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[#DC2626] transition-colors hover:bg-red-50 ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                            role="menuitem"
                          >
                            <Trash2 size={16} />
                            {t('delete')}
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
