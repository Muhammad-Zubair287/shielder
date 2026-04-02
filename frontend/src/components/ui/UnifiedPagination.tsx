'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UnifiedPaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isRTL?: boolean;
  className?: string;
  labels?: {
    showing?: string;
    of?: string;
    total?: string;
    results?: string;
    previous?: string;
    next?: string;
  };
}

const buildPages = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  if (page > 3) pages.push('ellipsis');

  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
    pages.push(i);
  }

  if (page < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
};

export default function UnifiedPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isRTL = false,
  className = '',
  labels,
}: UnifiedPaginationProps) {
  if (totalPages <= 1) return null;

  const prevIcon = isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />;
  const nextIcon = isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />;
  const pages = buildPages(page, totalPages);

  const start = totalItems && pageSize ? (page - 1) * pageSize + 1 : undefined;
  const end = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div
      className={`px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3 ${
        isRTL ? 'flex-row-reverse' : ''
      } ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <p className="text-xs text-gray-400">
        {typeof totalItems === 'number' && typeof start === 'number' && typeof end === 'number'
          ? `${labels?.showing ?? 'Showing'} ${start}-${end} ${labels?.of ?? 'of'} ${totalItems} ${labels?.results ?? 'results'}`
          : `${labels?.total ?? 'Total'} ${totalItems ?? 0} ${labels?.results ?? 'results'}`}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={labels?.previous ?? 'Previous'}
        >
          {prevIcon}
        </button>

        {pages.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                page === item
                  ? 'bg-[#5B5FC7] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label={labels?.next ?? 'Next'}
        >
          {nextIcon}
        </button>
      </div>
    </div>
  );
}
