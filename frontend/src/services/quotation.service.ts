/**
 * Quotation Service — Frontend API client
 */

import apiClient from './api.service';

export interface QuotationItem {
    productId: string;
    quantity: number;
    discount?: number;
}

export interface CreateQuotationData {
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerAddress?: string;
    companyName?: string;
    items: QuotationItem[];
    discount?: number;
    taxRate?: number;
    notes?: string;
    terms?: string;
    quotationDate?: string;
    expiryDate: string;
}

const quotationService = {
    /**
     * Get all quotations (admin view)
     */
    getAll: async (params?: Record<string, string | number | boolean>) => {
        const response = await apiClient.get('/quotations', { params });
        return response.data;
    },

    /**
     * Get customer's quotations
     */
    getMyQuotations: async (params?: Record<string, string | number | boolean>) => {
        const response = await apiClient.get('/quotations/my', { params });
        return response.data;
    },

    searchProducts: (search: string, limit = 5) =>
        apiClient.get('/inventory/products', { params: { search, limit } }),

    getById: (id: string) =>
        apiClient.get(`/quotations/${id}`),

    create: (data: CreateQuotationData) =>
        apiClient.post('/quotations', data),

    update: (id: string, data: Partial<CreateQuotationData>) =>
        apiClient.put(`/quotations/${id}`, data),

    delete: (id: string) =>
        apiClient.delete(`/quotations/${id}`),

    send: (id: string, adminReply?: string) =>
        apiClient.post(`/quotations/${id}/send`, adminReply ? { adminReply } : {}),

    approve: (id: string) =>
        apiClient.post(`/quotations/${id}/approve`),

    reject: (id: string, reason: string) =>
        apiClient.post(`/quotations/${id}/reject`, { reason }),

    convertToOrder: (id: string) =>
        apiClient.post(`/quotations/${id}/convert`),

    reactivate: (id: string, expiryDate: string) =>
        apiClient.post(`/quotations/${id}/reactivate`, { expiryDate }),

    getAnalytics: () =>
        apiClient.get('/quotations/analytics'),

    expireStale: () =>
        apiClient.post('/quotations/expire-stale'),
};

export default quotationService;
