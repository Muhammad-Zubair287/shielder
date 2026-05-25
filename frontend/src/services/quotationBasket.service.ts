/**
 * Quotation Basket Service
 * API client for persistent quotation basket management (backend-synced)
 */

import apiClient from '@/services/api.service';
import { API_ENDPOINTS } from '@/utils/constants';

export interface QuotationBasketItem {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
  stock?: number | null;
}

export interface QuotationBasketResponse {
  items: QuotationBasketItem[];
  itemCount: number;
  totalQuantity: number;
}

class QuotationBasketService {
  /**
   * Get customer's quotation basket from backend
   */
  async getBasket(): Promise<QuotationBasketResponse> {
    const res = await apiClient.get(API_ENDPOINTS.QUOTATION_BASKET.BASE);
    return res.data.data;
  }

  /**
   * Add or update item in basket
   */
  async addItem(productId: string, quantity: number): Promise<QuotationBasketResponse> {
    const res = await apiClient.post(API_ENDPOINTS.QUOTATION_BASKET.ITEMS, {
      productId,
      quantity,
    });
    return res.data.data;
  }

  /**
   * Update item quantity
   */
  async updateItem(productId: string, quantity: number): Promise<QuotationBasketResponse> {
    const res = await apiClient.patch(
      API_ENDPOINTS.QUOTATION_BASKET.ITEM(productId),
      { quantity }
    );
    return res.data.data;
  }

  /**
   * Remove item from basket
   */
  async removeItem(productId: string): Promise<QuotationBasketResponse> {
    const res = await apiClient.delete(API_ENDPOINTS.QUOTATION_BASKET.ITEM(productId));
    return res.data.data;
  }

  /**
   * Clear entire basket
   */
  async clearBasket(): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.QUOTATION_BASKET.BASE);
  }
}

export default new QuotationBasketService();
