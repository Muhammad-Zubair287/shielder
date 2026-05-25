'use client';

/**
 * CartSummary component
 * Shows Subtotal | Shipping | dashed separator | Total | Checkout button
 * Matches the reference screenshot layout exactly.
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useAuthStore } from '@/store/auth.store';
import SARSymbol from '@/components/SARSymbol';

// Static shipping cost — replace with dynamic value from settings if needed
const SHIPPING_COST: number = 0; // free shipping; set to a number if applicable

interface CartSummaryProps {
  /** Fired after successful checkout validation before navigation */
  onCheckout?: () => void;
}

export default function CartSummary({ onCheckout }: CartSummaryProps) {
  const { t, isRTL } = useLanguage();
  const { cart, loading } = useCart();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const subtotal = cart.totalAmount;
  const shipping = SHIPPING_COST;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error(t('cart.loginRequired'));
      // Store intended destination so login page can redirect back
      sessionStorage.setItem('checkout_redirect', '/checkout');
      router.push('/login');
      return;
    }

    if (cart.items.length === 0) return;

    onCheckout?.();
    router.push('/checkout');
  };

  return (
    <div className={`mt-6 ${isRTL ? 'text-right' : 'text-start'}`} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Subtotal row */}
      <div className={`flex items-center justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm text-gray-600">{t('cart.subtotal')}</span>
        <span className="text-sm font-semibold text-[#0D1637] flex items-center gap-0.5"><SARSymbol />{subtotal.toFixed(2)}</span>
      </div>

      {/* Shipping row */}
      <div className={`flex items-center justify-between py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm text-gray-600">{t('cart.shipping')}</span>
        <span className="text-sm font-semibold text-[#0D1637]">
          {shipping === 0 ? t('cart.free') : <span className="flex items-center gap-0.5"><SARSymbol />{shipping.toFixed(2)}</span>}
        </span>
      </div>

      {/* Dashed divider */}
      <hr className="border-dashed border-gray-300 my-3" />

      {/* Total row */}
      <div className={`flex items-center justify-between py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-base font-bold text-gray-900">{t('cart.total')}</span>
        <span className="text-base font-bold text-[#0D1637] flex items-center gap-0.5"><SARSymbol />{total.toFixed(2)}</span>
      </div>

      {/* Checkout button */}
      <button
        onClick={handleCheckout}
        disabled={loading || cart.items.length === 0}
        className="mt-5 w-full bg-[#F97316] hover:bg-[#e8650a] active:bg-[#d45d0a] text-white font-semibold text-base py-4 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {t('cart.checkout')}
      </button>
    </div>
  );
}
