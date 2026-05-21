'use client';

/**
 * QuotationContext
 * Manages a client-side "quotation basket" stored in localStorage.
 * Users can add products here, then open the QuotationDrawer to fill in
 * company details and generate a PDF.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotationBasketItem {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
  stock?: number | null;
}

interface QuotationContextValue {
  items: QuotationBasketItem[];
  itemCount: number;
  addItem: (
    item: Omit<QuotationBasketItem, 'quantity'> & { quantity?: number },
  ) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearBasket: () => void;
  /** Whether the drawer is open */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const QuotationContext = createContext<QuotationContextValue>({
  items: [],
  itemCount: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQty: () => {},
  clearBasket: () => {},
  drawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

const STORAGE_KEY = 'quotation_basket';

// ── Provider ──────────────────────────────────────────────────────────────────

export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems]           = useState<QuotationBasketItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Persist helper — updates state and localStorage together
  const persist = useCallback((updated: QuotationBasketItem[]) => {
    setItems(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const addItem = useCallback(
    (item: Omit<QuotationBasketItem, 'quantity'> & { quantity?: number }) => {
      setItems(prev => {
        const qty      = item.quantity ?? 1;
        const existing = prev.find(i => i.productId === item.productId);
        const updated  = existing
          ? prev.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + qty }
                : i,
            )
          : [...prev, { ...item, quantity: qty }];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
    },
    [],
  );

  const removeItem = useCallback((productId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.productId !== productId);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const updateQty = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems(prev => {
      const updated = prev.map(i =>
        i.productId === productId ? { ...i, quantity } : i,
      );
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <QuotationContext.Provider
      value={{
        items,
        itemCount,
        addItem,
        removeItem,
        updateQty,
        clearBasket,
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
  return useContext(QuotationContext);
}
