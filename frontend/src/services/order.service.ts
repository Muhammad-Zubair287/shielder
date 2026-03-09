import apiClient from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';

class OrderService {
  async getOrders(params?: any) {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.BASE, { params });
    return response.data;
  }

  async getMyOrders(params?: { page?: number; limit?: number }) {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.MY, { params });
    return response.data;
  }

  async getOrderById(id: string) {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.BY_ID(id));
    return response.data;
  }

  async updateOrderStatus(id: string, statusData: { status?: string; paymentStatus?: string }) {
    const response = await apiClient.patch(API_ENDPOINTS.ORDERS.UPDATE_STATUS(id), statusData);
    return response.data;
  }

  async getOrderSummary() {
    const response = await apiClient.get(`${API_ENDPOINTS.ORDERS.BASE}/summary`);
    return response.data;
  }

  async createOrder(orderData: any) {
    const response = await apiClient.post(API_ENDPOINTS.ORDERS.BASE, orderData);
    return response.data;
  }

  /** Initialize EPG card payment — returns { paymentUrl, orderId, sessionId } */
  async initializeEPGPayment(payload: {
    items: Array<{ productId: string; quantity: number }>;
    customerName: string;
    phoneNumber: string;
    shippingAddress: string;
    notes?: string;
  }) {
    const response = await apiClient.post(API_ENDPOINTS.EPG.INITIALIZE, payload);
    return response.data;
  }
}

export const orderService = new OrderService();
