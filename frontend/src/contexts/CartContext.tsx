'use client';

/**
 * CartContext
 * Global cart state — syncs with backend for authenticated users,
 * localStorage for guests.  Merges guest cart on login.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import cartService, { Cart, CartProduct } from '@/services/cart.service';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Context shape ─────────────────────────────────────────────────────────────

interface CartContextType {
  cart: Cart;
  itemCount: number;
  loading: boolean;
  addItem: (
    productId: string,
    quantity: number,
    product: CartProduct,
    price: number,
  ) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const EMPTY_CART: Cart = { items: [], totalAmount: 0 };

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(false);

  /** Compute badge count from current cart */
  const itemCount = cartService.countItems(cart);

  /** Load (or reload) cart */
  const refreshCart = useCallback(async () => {
    setLoading(true);
    try {
      const freshCart = await cartService.getCart();
      setCart(freshCart);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        // Token expired — the api interceptor will handle logout
      } else if (status === 403) {
        toast.error(t('cart.accessDenied'));
      } else if (status && status >= 500) {
        toast.error(t('cart.serverError'));
      }
      // Keep existing cart on error
    } finally {
      setLoading(false);
    }
  }, [t]);

  /** Reload cart whenever auth state changes (login / logout) */
  useEffect(() => {
    (async () => {
      if (isAuthenticated) {
        // Merge any guest items first, then load the merged cart
        await cartService.mergeGuestCart();
      }
      await refreshCart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async (productId: string, quantity: number, product: CartProduct, price: number) => {
      setLoading(true);
      try {
        const updated = await cartService.addItem(productId, quantity, product, price);
        setCart(updated);
        toast.success(t('cart.addedToCart'));
      } catch (err: any) {
        const msg = err?.response?.data?.message || '';
        if (msg.toLowerCase().includes('stock')) {
          toast.error(t('cart.stockError'));
        } else if (err?.response?.status === 401) {
          // handled by interceptor
        } else if (err?.response?.status >= 500) {
          toast.error(t('cart.serverError'));
        } else {
          toast.error(t('cart.errorAdding'));
        }
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const updateItem = useCallback(
    async (productId: string, quantity: number) => {
      // Optimistic update - DO NOT WAIT FOR API RESPONSE
      setCart((prev) => {
        const items = prev.items.map((item) =>
          item.productId === productId
            ? { ...item, quantity, subtotal: item.priceAtTime * quantity }
            : item,
        ).filter((item) => item.quantity > 0);
        return {
          ...prev,
          items,
          totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
        };
      });

      // Fire-and-forget: API call in background WITHOUT awaiting
      cartService.updateItem(productId, quantity).catch(async (err: any) => {
        const msg = err?.response?.data?.message || '';
        if (msg.toLowerCase().includes('stock')) {
          toast.error(t('cart.stockError'));
        } else if (err?.response?.status >= 500) {
          toast.error(t('cart.serverError'));
        } else {
          toast.error(t('cart.errorUpdating'));
        }
        // Revert optimistic update on error
        await refreshCart();
      });
    },
    [t, refreshCart],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      // Optimistic remove - DO NOT WAIT FOR API RESPONSE
      setCart((prev) => {
        const items = prev.items.filter((i) => i.productId !== productId);
        return {
          ...prev,
          items,
          totalAmount: items.reduce((s, i) => s + i.subtotal, 0),
        };
      });

      // Fire-and-forget: API call in background WITHOUT awaiting
      cartService.removeItem(productId).then(() => {
        toast.success(t('cart.removedFromCart'));
      }).catch(async (err: any) => {
        toast.error(t('cart.errorRemoving'));
        // Revert optimistic remove on error
        await refreshCart();
      });
    },
    [t, refreshCart],
  );

  const clearCart = useCallback(async () => {
    try {
      const updated = await cartService.clearCart();
      setCart(updated);
      toast.success(t('cart.cartCleared'));
    } catch {
      toast.error(t('cart.serverError'));
    }
  }, [t]);

  // ── Context value ────────────────────────────────────────────────────────────

  return (
    <CartContext.Provider
      value={{ cart, itemCount, loading, addItem, updateItem, removeItem, clearCart, refreshCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
