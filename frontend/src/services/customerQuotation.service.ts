/**
 * Customer Quotation Service
 * Self-service, instant quotation generation for customers.
 */

import apiClient from '@/services/api.service';
import { API_ENDPOINTS, API_CONFIG } from '@/utils/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuotationProduct {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  thumbnail?: string | null;
}

export interface GenerateQuotationPayload {
  companyName: string;
  vatNumber: string;
  address: string;
  products: QuotationProduct[];
}

export interface QuotationItemResult {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail?: string | null;
}

export interface QuotationResult {
  id: string;
  quotationNumber: string;
  status: string;
  companyName: string;
  customerAddress: string;
  customerEmail: string;
  vatNumber: string;
  userMessage?: string | null;
  adminReply?: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  quotationDate: string;
  expiryDate: string;
  items: QuotationItemResult[];
}

export interface QuotationListResponse {
  data: QuotationResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

const customerQuotationService = {
  /**
   * Fetch the authenticated customer's quotations.
   */
  async getMyQuotations(params?: { page?: number; limit?: number; status?: string }): Promise<QuotationResult[]> {
    const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_QUOTATIONS.MY, { params });
    return (res.data.data || []) as QuotationResult[];
  },

  /**
   * Generate a quotation — sends form data + product list to backend.
   */
  async generate(payload: GenerateQuotationPayload): Promise<QuotationResult> {
    const res = await apiClient.post(API_ENDPOINTS.CUSTOMER_QUOTATIONS.GENERATE, payload);
    return res.data.data as QuotationResult;
  },

  /**
   * Fetch a single quotation by ID.
   */
  async getById(id: string): Promise<QuotationResult> {
    const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_QUOTATIONS.BY_ID(id));
    return res.data.data as QuotationResult;
  },

  /**
   * Trigger browser download of the PDF.
   * We fetch the binary from the API and create a local object URL.
   */
  async downloadPDF(id: string, filename: string): Promise<void> {
    const token = sessionStorage.getItem('shielder_access_token');
    const url   = `${API_CONFIG.BASE_URL}/${API_ENDPOINTS.CUSTOMER_QUOTATIONS.PDF(id)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    const blob   = await response.blob();
    const objUrl = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = objUrl;
    a.download   = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  },

  /**
   * Customer accepts a quotation.
   */
  async accept(id: string): Promise<QuotationResult> {
    const res = await apiClient.post(API_ENDPOINTS.CUSTOMER_QUOTATIONS.ACCEPT(id), {});
    return res.data.data as QuotationResult;
  },

  /**
   * Customer rejects a quotation.
   */
  async reject(id: string, reason?: string): Promise<QuotationResult> {
    const payload = reason?.trim() ? { reason: reason.trim() } : {};
    const res = await apiClient.post(API_ENDPOINTS.CUSTOMER_QUOTATIONS.REJECT(id), payload);
    return res.data.data as QuotationResult;
  },
};

export default customerQuotationService;
