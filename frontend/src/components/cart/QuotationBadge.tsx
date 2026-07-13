'use client';

/**
 * QuotationBadge
 * Download-file icon with a live badge showing how many items are in the
 * quotation basket.  Clicking it opens the QuotationDrawer.
 */

import React from 'react';
import { Download } from 'lucide-react';
import { useQuotation } from '@/contexts/QuotationContext';

export default function QuotationBadge() {
  const { itemCount, openDrawer } = useQuotation();

  return (
    <button
      onClick={openDrawer}
      aria-label="Quotation basket"
      className="relative p-2 text-gray-700 hover:text-[#0D1637] hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Download size={20} />
      {itemCount > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-[#0205A6] text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}
