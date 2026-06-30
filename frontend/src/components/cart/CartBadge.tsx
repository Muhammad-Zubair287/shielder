'use client';

/**
 * CartBadge
 * ShoppingCart icon with a live-count badge.
 * Drop it anywhere in the navbar.
 */

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CartBadge() {
  const { itemCount } = useCart();
  const { t } = useLanguage();

  return (
    <Link
      href="/cart"
      aria-label={t('landingNavCartLabel')}
      className="relative p-2 text-[#0B2345] hover:text-[#0D2F8C] hover:bg-gray-50 rounded-lg transition-colors"
    >
      <ShoppingCart size={20} />
      {itemCount > 0 && (
        <span className="absolute top-0.5 right-0.5 bg-[#123C9C] text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  );
}
