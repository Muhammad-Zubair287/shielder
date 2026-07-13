'use client';

/**
 * /cart  –  Cart Page
 *
 * Layout matches the reference screenshot:
 *   ← back arrow       My Cart
 *   ┌─────────────────────────┐
 *   │  [img] Product  + 1 –  ₼99.50 │
 *   │─────────────────────────│
 *   │  ...                    │
 *   └─────────────────────────┘
 *   Subtotal          ₼ xxx.xx
 *   Shipping          ₼ xxx.xx
 *   - - - - - - - - - - - - -
 *   Total             ₼ xxx.xx
 *          [ Checkout ]
 *   <Footer>
 *
 * Fully RTL-aware, i18n, mobile-responsive.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShoppingBag } from 'lucide-react';
import LandingNavbar from '@/app/home/_components/LandingNavbar';
import LandingFooter from '@/app/home/_components/LandingFooter';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function CartSkeleton() {
  return (
    <div className="animate-pulse space-y-0 border border-gray-200 rounded-2xl overflow-hidden bg-white">
      {[1, 2, 3].map((_, i, arr) => (
        <div key={i}>
          <div className="flex items-center gap-4 py-4 px-4">
            <div className="w-[68px] h-[68px] bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-6 bg-gray-100 rounded w-1/3 mt-2" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
          {i < arr.length - 1 && <hr className="border-gray-100 mx-4" />}
        </div>
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyCart({ t, isRTL }: { t: (k: string) => string; isRTL: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-5 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
        <ShoppingBag size={36} className="text-[#0205A6]" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{t('cart.empty')}</p>
        <p className="text-sm text-gray-500 mt-1">{t('cart.emptySubtitle')}</p>
      </div>
      <Link
        href="/products"
        className="inline-flex items-center gap-2 bg-[#0205A6] hover:bg-[#0103d4] text-white font-semibold text-sm px-7 py-3 rounded-2xl transition-colors shadow-sm"
      >
        {t('cart.goToProducts')}
      </Link>
    </div>
  );
}

// ── Cart Page ─────────────────────────────────────────────────────────────────

export default function CartPage() {
  const { t, isRTL } = useLanguage();
  const { cart, loading } = useCart();

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <LandingNavbar />

      {/* Main content */}
      <main className="flex-1 pt-[120px] pb-32 sm:pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Page header */}
          <div className={`flex items-center mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link
              href="/products"
              className="p-2 text-gray-600 hover:text-[#0205A6] hover:bg-blue-50 rounded-lg transition-colors me-auto"
              aria-label="back"
            >
              <BackArrow size={22} />
            </Link>

            <h1 className="absolute inset-x-0 text-center text-xl font-bold text-gray-900 pointer-events-none">
              {t('cart.title')}
            </h1>
          </div>

          {/* Loading state */}
          {loading && cart.items.length === 0 ? (
            <CartSkeleton />
          ) : cart.items.length === 0 ? (
            <EmptyCart t={t} isRTL={isRTL} />
          ) : (
            <>
              {/* Items card */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                {cart.items.map((item, idx) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    isLast={idx === cart.items.length - 1}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6">
                <CartSummary />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Fixed checkout bar on mobile (when cart has items) */}
      {!loading && cart.items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 shadow-lg z-30">
          <Link
            href="/checkout"
            className="block w-full bg-[#0D2F8C] hover:bg-[#004A99] text-white font-semibold text-base py-4 rounded-2xl text-center transition-colors shadow-sm"
          >
            {t('cart.checkout')}
          </Link>
        </div>
      )}

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
