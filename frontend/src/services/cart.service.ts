/**
 * Cart Service
 * Handles all cart API interactions and guest localStorage cart
 */

import apiClient from '@/services/api.service';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartProduct {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string | null;
  isActive?: boolean;
  stock?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtTime: number;
  subtotal: number;
  product: CartProduct;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  totalAmount: number;
  currency?: string;
}

// Guest cart item stored in localStorage (minimal shape)
export interface GuestCartItem {
  productId: string;
  quantity: number;
  priceAtTime: number;
  product: CartProduct;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

// ── Guest Cart (localStorage) ─────────────────────────────────────────────────

function readGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(items: GuestCartItem[]): void {
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
}

function buildGuestCart(items: GuestCartItem[]): Cart {
  const cartItems: CartItem[] = items.map((item, idx) => ({
    id: `guest-${idx}`,
    productId: item.productId,
    quantity: item.quantity,
    priceAtTime: item.priceAtTime,
    subtotal: item.priceAtTime * item.quantity,
    product: item.product,
  }));
  return {
    items: cartItems,
    totalAmount: cartItems.reduce((sum, i) => sum + i.subtotal, 0),
  };
}

// ── API Cart ──────────────────────────────────────────────────────────────────

async function fetchCart(): Promise<Cart> {
  const res = await apiClient.get(API_ENDPOINTS.CART.BASE);
  return res.data.data as Cart;
}

function isCartPayload(data: unknown): data is Cart {
  if (!data || typeof data !== 'object') return false;
  const maybeCart = data as Partial<Cart>;
  return Array.isArray(maybeCart.items) && typeof maybeCart.totalAmount === 'number';
}

async function apiAddItem(productId: string, quantity: number): Promise<Cart> {
  const res = await apiClient.post(API_ENDPOINTS.CART.ADD, { productId, quantity });
  if (isCartPayload(res.data?.data)) {
    return res.data.data;
  }
  return fetchCart();
}

async function apiUpdateItem(productId: string, quantity: number): Promise<Cart> {
  const res = await apiClient.put(API_ENDPOINTS.CART.UPDATE, { productId, quantity });
  if (isCartPayload(res.data?.data)) {
    return res.data.data;
  }
  return fetchCart();
}

async function apiRemoveItem(productId: string): Promise<Cart> {
  const res = await apiClient.delete(API_ENDPOINTS.CART.REMOVE(productId));
  if (isCartPayload(res.data?.data)) {
    return res.data.data;
  }
  return fetchCart();
}

async function apiClearCart(): Promise<Cart> {
  const res = await apiClient.delete(API_ENDPOINTS.CART.CLEAR);
  if (isCartPayload(res.data?.data)) {
    return res.data.data;
  }
  return { items: [], totalAmount: 0 };
}

// ── Public Service ────────────────────────────────────────────────────────────

const cartService = {
  /**
   * Load cart — from API if authenticated, otherwise from localStorage
   */
  async getCart(): Promise<Cart> {
    if (isAuthenticated()) {
      return fetchCart();
    }
    const items = readGuestCart();
    return buildGuestCart(items);
  },

  /**
   * Add item to cart
   * @param productId
   * @param quantity
   * @param productData - product metadata for guest cart
   * @param priceAtTime - unit price for guest cart
   */
  async addItem(
    productId: string,
    quantity: number,
    productData: CartProduct,
    priceAtTime: number,
  ): Promise<Cart> {
    if (isAuthenticated()) {
      return apiAddItem(productId, quantity);
    }

    // Guest cart
    const items = readGuestCart();
    const existing = items.findIndex((i) => i.productId === productId);
    if (existing >= 0) {
      items[existing].quantity += quantity;
    } else {
      items.push({ productId, quantity, priceAtTime, product: productData });
    }
    writeGuestCart(items);
    return buildGuestCart(items);
  },

  /**
   * Update quantity of an item
   * Uses productId in both auth and guest modes
   */
  async updateItem(productId: string, quantity: number): Promise<Cart> {
    if (isAuthenticated()) {
      return apiUpdateItem(productId, quantity);
    }

    // Guest cart
    const items = readGuestCart();
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      if (quantity <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].quantity = quantity;
      }
    }
    writeGuestCart(items);
    return buildGuestCart(items);
  },

  /**
   * Remove item from cart
   */
  async removeItem(productId: string): Promise<Cart> {
    if (isAuthenticated()) {
      return apiRemoveItem(productId);
    }

    // Guest cart
    const items = readGuestCart().filter((i) => i.productId !== productId);
    writeGuestCart(items);
    return buildGuestCart(items);
  },

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<Cart> {
    if (isAuthenticated()) {
      return apiClearCart();
    }

    writeGuestCart([]);
    return { items: [], totalAmount: 0 };
  },

  /**
   * Merge guest cart into authenticated cart after login
   */
  async mergeGuestCart(): Promise<void> {
    if (!isAuthenticated()) return;
    const guests = readGuestCart();
    if (guests.length === 0) return;

    for (const item of guests) {
      try {
        await apiClient.post(API_ENDPOINTS.CART.ADD, {
          productId: item.productId,
          quantity: item.quantity,
        });
      } catch {
        // Best-effort: skip failed items
      }
    }
    writeGuestCart([]);
  },

  /** Count distinct products in cart */
  countItems(cart: Cart): number {
    return cart.items.length;
  },
};

export default cartService;
