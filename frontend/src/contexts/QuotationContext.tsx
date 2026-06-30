'use client';

/**
 * QuotationContext - REFACTORED for Backend Synchronization
 * Manages persistent quotation basket synced with backend.
 * Mirrors Cart architecture for consistency and multi-device support.
 * 
 * BEFORE: localStorage only (session-specific, no sync)
 * AFTER:  Backend API (persistent, synced across devices)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import quotationBasketService, { QuotationBasketItem } from '@/services/quotationBasket.service';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Context shape ────────────────────────────────────────────────────────────

interface QuotationContextValue {
  items: QuotationBasketItem[];
  itemCount: number;
  loading: boolean;
  hasInvalidItems: boolean;
  
  addItem: (
    item: Omit<QuotationBasketItem, 'quantity'> & { quantity?: number },
  ) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQty: (productId: string, quantity: number) => Promise<void>;
  updateQtyOptimistic: (productId: string, quantity: number) => void;
  clearBasket: () => Promise<void>;
  refreshBasket: () => Promise<void>;
  setItemValidation: (productId: string, isValid: boolean) => void;
  
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const QuotationContext = createContext<QuotationContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────

export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<QuotationBasketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [invalidItemIds, setInvalidItemIds] = useState<Set<string>>(new Set());

  /**
   * Load basket from backend
   * Source of truth: Backend database, not localStorage
   */
  const refreshBasket = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const basket = await quotationBasketService.getBasket();
      setItems(basket.items);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        // Token expired - interceptor will handle logout
      } else if (status === 403) {
        toast.error(t('quotation.accessDenied') || 'Access denied');
      } else if (status && status >= 500) {
        toast.error(t('quotation.serverError') || 'Server error');
      }
      // Keep existing items on error (graceful fallback)
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  /**
   * Reload basket whenever auth state changes (login/logout)
   * This ensures multi-device sync: Profile A and Profile B both fetch from same backend
   */
  useEffect(() => {
    refreshBasket();
  }, [isAuthenticated, refreshBasket]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const addItem = useCallback(
    async (item: Omit<QuotationBasketItem, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;

      // Optimistic update - immediate UI feedback
      setItems(prev => {
        const existing = prev.find(i => i.productId === item.productId);
        return existing
          ? prev.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + qty }
                : i,
            )
          : [...prev, { ...item, quantity: qty }];
      });

      // Fire-and-forget: API call in background WITHOUT awaiting
      quotationBasketService.addItem(item.productId, qty).catch(async (err: any) => {
        const msg = err?.response?.data?.message || '';
        console.error('Failed to add quotation item:', err);
        
        if (msg.toLowerCase().includes('stock')) {
          toast.error(t('quotation.stockError') || 'Insufficient stock');
        } else if (err?.response?.status === 401) {
          // handled by interceptor
        } else if (err?.response?.status >= 500) {
          toast.error(t('quotation.serverError') || 'Server error');
        } else {
          toast.error(t('quotation.errorAdding') || 'Failed to add item');
        }
        
        // Revert optimistic update on error
        await refreshBasket();
      });
    },
    [t, refreshBasket]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      // Optimistic remove - immediate UI feedback
      setItems(prev => prev.filter(i => i.productId !== productId));

      // Fire-and-forget: API call
      quotationBasketService.removeItem(productId).catch(async (err: any) => {
        console.error('Failed to remove quotation item:', err);
        toast.error(t('quotation.errorRemoving') || 'Failed to remove item');
        // Revert optimistic update on error
        await refreshBasket();
      });
    },
    [t, refreshBasket]
  );

  const updateQty = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity < 1) {
        await removeItem(productId);
        return;
      }

      // Optimistic update - immediate UI feedback
      setItems(prev =>
        prev.map(i => (i.productId === productId ? { ...i, quantity } : i))
      );

      // Fire-and-forget: API call
      quotationBasketService.updateItem(productId, quantity).catch(async (err: any) => {
        console.error('Failed to update quotation quantity:', err);
        
        const msg = err?.response?.data?.message || '';
        if (msg.toLowerCase().includes('stock')) {
          toast.error(t('quotation.stockError') || 'Insufficient stock');
        } else if (err?.response?.status >= 500) {
          toast.error(t('quotation.serverError') || 'Server error');
        } else {
          toast.error(t('quotation.errorUpdating') || 'Failed to update quantity');
        }
        
        // Revert optimistic update on error
        await refreshBasket();
      });
    },
    [removeItem, t, refreshBasket]
  );

  const updateQtyOptimistic = useCallback((productId: string, quantity: number) => {
    setItems(prev =>
      prev.map(i => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearBasket = useCallback(async () => {
    // Optimistic clear
    setItems([]);

    // Fire-and-forget: API call
    quotationBasketService.clearBasket().catch(async (err: any) => {
      console.error('Failed to clear quotation basket:', err);
      toast.error(t('quotation.errorClearing') || 'Failed to clear basket');
      // Revert optimistic update on error
      await refreshBasket();
    });
  }, [t, refreshBasket]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const itemCount = items.length;

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

  return (
    <QuotationContext.Provider
      value={{
        items,
        itemCount,
        loading,
        hasInvalidItems,
        addItem,
        removeItem,
        updateQty,
        updateQtyOptimistic,
        clearBasket,
        refreshBasket,
        setItemValidation,
        drawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </QuotationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQuotation() {
  const context = useContext(QuotationContext);
  if (!context) {
    throw new Error('useQuotation must be used within QuotationProvider');
  }
  return context;
}
