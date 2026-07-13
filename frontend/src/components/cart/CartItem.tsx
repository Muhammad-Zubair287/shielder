'use client';

/**
 * CartItem component
 * Displays one cart row: product image | name | quantity selector | price
 * Matches the design in the reference screenshot.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/services/cart.service';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { getImageUrl } from '@/utils/helpers';
import SARSymbol from '@/components/SARSymbol';

const PLACEHOLDER = '/images/landing/factory-1.png';

interface CartItemProps {
  item: CartItemType;
  isLast: boolean;
}

export default function CartItem({ item, isLast }: CartItemProps) {
  const { t, isRTL } = useLanguage();
  const { updateItem, updateItemOptimistic, removeItem, loading, setItemValidation } = useCart();

  const [inputValue, setInputValue] = useState(String(item.quantity));
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const image = getImageUrl(item.product.thumbnail) ?? PLACEHOLDER;
  const stockLimit = typeof item.product.stock === 'number' ? item.product.stock : null;

  const validateQuantity = useCallback(
    (raw: string): { value: number; error: string | null; isValid: boolean } => {
      const trimmed = raw.trim();

      if (trimmed === '') {
        return { value: 0, error: t('cart.quantityInvalid'), isValid: false };
      }

      // Reject leading zeros like 0005
      if (/^0\d+$/.test(trimmed)) {
        return { value: 0, error: t('cart.quantityInvalid'), isValid: false };
      }

      // Reject non-integer / non-numeric input
      if (!/^\d+$/.test(trimmed)) {
        return { value: 0, error: t('cart.quantityInvalid'), isValid: false };
      }

      const parsed = Number(trimmed);

      if (parsed < 1) {
        return { value: 0, error: t('cart.quantityMinError'), isValid: false };
      }

      if (stockLimit !== null && parsed > stockLimit) {
        return { value: 0, error: t('cart.quantityExceedsStock'), isValid: false };
      }

      return { value: parsed, error: null, isValid: true };
    },
    [stockLimit, t]
  );

  const applyQuantity = useCallback(
    (nextQuantity: number) => {
      updateItem(item.productId, nextQuantity);
      setInputValue(String(nextQuantity));
      setError(null);
      setItemValidation(item.productId, true);
    },
    [updateItem, item.productId, setItemValidation]
  );

  const previewQuantity = useCallback(
    (nextQuantity: number) => {
      updateItemOptimistic(item.productId, nextQuantity);
    },
    [updateItemOptimistic, item.productId]
  );

  const handleDecrease = () => {
    if (item.quantity <= 1) {
      removeItem(item.productId);
    } else {
      applyQuantity(item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    applyQuantity(item.quantity + 1);
  };

  const commitInput = useCallback(
    (raw: string) => {
      const { value, error, isValid } = validateQuantity(raw);

      if (!isValid) {
        setError(error);
        setInputValue(raw);
        setItemValidation(item.productId, false);
        return;
      }

      if (value !== item.quantity) {
        applyQuantity(value);
      } else {
        setInputValue(String(item.quantity));
        setError(null);
        setItemValidation(item.productId, true);
      }
    },
    [validateQuantity, item.quantity, item.productId, applyQuantity, setItemValidation]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow only digits while typing
    if (!/^\d*$/.test(raw)) {
      return;
    }

    setInputValue(raw);

    // Real-time price preview for valid intermediate values (no API call yet)
    if (raw.trim() !== '') {
      const { isValid, value } = validateQuantity(raw);
      if (isValid && value !== item.quantity) {
        previewQuantity(value);
      }
    }

    // Clear error while user is typing a valid-looking value
    if (raw.trim() !== '' && /^\d+$/.test(raw) && !(/^0\d+$/.test(raw))) {
      setError(null);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    commitInput(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue(String(item.quantity));
      setError(null);
      setItemValidation(item.productId, true);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    setError(null);
  };

  // Keep input in sync if cart updates from elsewhere
  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(item.quantity));
    }
  }, [item.quantity, isEditing]);

  return (
    <>
      <div
        className="flex items-center gap-4 py-4 px-2"
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
        <div className="flex-1 min-w-0 text-start">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>

          {typeof item.product.stock === 'number' && (
            <p className={`mt-1 text-xs font-semibold ${item.product.stock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {item.product.stock === 0
                ? (t('productsOutOfStock') || 'Out of Stock')
                : `${item.product.stock} ${t('productsInStock') || 'in stock'}`}
            </p>
          )}

          {/* Quantity selector */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleIncrease}
              disabled={stockLimit !== null && item.quantity >= stockLimit}
              aria-label="increase"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-[#0205A6] hover:text-[#0205A6] transition-colors disabled:opacity-40"
            >
              <Plus size={12} strokeWidth={3} />
            </button>

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              aria-label={t('cart.quantity')}
              aria-invalid={!!error}
              className={`text-sm font-semibold text-gray-800 w-12 text-center border rounded-md py-0.5 focus:outline-none focus:ring-2 focus:ring-[#0205A6] focus:border-[#0205A6] ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />

            <button
              onClick={handleDecrease}
              aria-label="decrease"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-[#0205A6] hover:text-[#0205A6] transition-colors disabled:opacity-40"
            >
              <Minus size={12} strokeWidth={3} />
            </button>
          </div>

          {error && !isEditing && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Price + remove */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-bold text-[#0D1637] flex items-center gap-0.5">
            <SARSymbol />{item.subtotal.toFixed(2)}
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