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
  hasInvalidItems: boolean;
  addItem: (
    productId: string,
    quantity: number,
    product: CartProduct,
    price: number,
    options?: { silent?: boolean },
  ) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  updateItemOptimistic: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => Promise<void>;
  clearCart: (options?: { silent?: boolean }) => Promise<void>;
  refreshCart: () => Promise<void>;
  setItemValidation: (productId: string, isValid: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const EMPTY_CART: Cart = { items: [], totalAmount: 0 };

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [invalidItemIds, setInvalidItemIds] = useState<Set<string>>(new Set());

  /** Compute badge count from current cart */
  const itemCount = cartService.countItems(cart);

  /** Track whether any cart item has an invalid quantity */
  const hasInvalidItems = invalidItemIds.size > 0;

  const setItemValidation = useCallback((productId: string, isValid: boolean) => {
    setInvalidItemIds((prev) => {
      const next = new Set(prev);
      if (isValid) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

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

  /** BroadcastChannel for cross-tab cart sync */
  const broadcast = useCallback((msg: string) => {
    if (typeof window === 'undefined') return;
    try {
      new BroadcastChannel('shielder:cart').postMessage(msg);
    } catch {
      // BroadcastChannel not supported — silently ignore
    }
  }, []);

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

  /** Listen for cart changes from other tabs */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel('shielder:cart');
      channel.onmessage = () => { refreshCart(); };
    } catch {
      return;
    }
    return () => channel.close();
  }, [refreshCart]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async (productId: string, quantity: number, product: CartProduct, price: number, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      setLoading(true);
      try {
        const updated = await cartService.addItem(productId, quantity, product, price);
        setCart(updated);
        if (!silent) toast.success(t('cart.addedToCart'));
        broadcast('cart_updated');
      } catch (err: any) {
        if (!silent) {
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
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [t, broadcast],
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
        broadcast('cart_updated');
      }).catch(async (err: any) => {
        toast.error(t('cart.errorRemoving'));
        // Revert optimistic remove on error
        await refreshCart();
      });
    },
    [t, refreshCart, broadcast],
  );

  const updateItemOptimistic = useCallback((productId: string, quantity: number) => {
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
  }, []);

  const clearCart = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      await cartService.clearCart();
    } catch {
      // Idempotent — server may already be empty; proceed regardless
    }
    setCart(EMPTY_CART);
    broadcast('cart_updated');
    if (!silent) {
      toast.success(t('cart.cartCleared'));
    }
  }, [t, broadcast]);

  // ── Context value ────────────────────────────────────────────────────────────

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        hasInvalidItems,
        addItem,
        updateItem,
        updateItemOptimistic,
        removeItem,
        clearCart,
        refreshCart,
        setItemValidation,
      }}
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