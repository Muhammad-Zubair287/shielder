'use client';

/**
 * CartItem component
 * Displays one cart row: product image | name | quantity selector | price
 * Matches the design in the reference screenshot.
 */

import React from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/services/cart.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';

const PLACEHOLDER = '/images/landing/factory-1.png';

interface CartItemProps {
  item: CartItemType;
  isLast: boolean;
}

export default function CartItem({ item, isLast }: CartItemProps) {
  const { t, isRTL } = useLanguage();
  const { updateItem, removeItem, loading } = useCart();

  const image = item.product.thumbnail ?? PLACEHOLDER;

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      removeItem(item.productId);
    } else {
      updateItem(item.productId, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    updateItem(item.productId, item.quantity + 1);
  };

  return (
    <>
      <div
        className={`flex items-center gap-4 py-4 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Product image */}
        <div className="relative w-[68px] h-[68px] rounded-xl overflow-hidden shrink-0 bg-gray-100">
          <Image
            src={image}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="68px"
          />
        </div>

        {/* Name + quantity control */}
        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>

          {/* Quantity selector */}
          <div className={`flex items-center gap-3 mt-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <button
              onClick={handleIncrease}
              disabled={loading}
              aria-label="increase"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-[#F97316] hover:text-[#F97316] transition-colors disabled:opacity-40"
            >
              <Plus size={12} strokeWidth={3} />
            </button>

            <span className="text-sm font-semibold text-gray-800 w-5 text-center">
              {item.quantity}
            </span>

            <button
              onClick={handleDecrease}
              disabled={loading}
              aria-label="decrease"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-[#F97316] hover:text-[#F97316] transition-colors disabled:opacity-40"
            >
              <Minus size={12} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Price + remove */}
        <div className={`flex flex-col items-end gap-2 shrink-0 ${isRTL ? 'items-start' : ''}`}>
          <span className="text-sm font-bold text-[#0D1637]">
            ₼{item.subtotal.toFixed(2)}
          </span>
          <button
            onClick={() => removeItem(item.productId)}
            disabled={loading}
            aria-label={t('cart.remove')}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Divider (not after last item) */}
      {!isLast && <hr className="border-gray-100 mx-2" />}
    </>
  );
}
