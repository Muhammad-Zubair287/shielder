/**
 * Admin API Service
 * Handles all dashboard-related API calls for Super Admin
 */

import apiClient from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';

class AdminService {
  /**
   * Analytics
   */
  async getOverview() {
    return apiClient.get('/analytics/overview');
  }

  async getMonthlyRevenue() {
    return apiClient.get('/analytics/revenue/monthly');
  }

  async getMonthlyOrders() {
    return apiClient.get('/analytics/orders/monthly');
  }

  async getByCategory() {
    return apiClient.get('/analytics/products/by-category');
  }

  async getUserGrowth() {
    return apiClient.get('/analytics/users/growth');
  }

  /**
   * Inventory & Products
   */
  async getProducts(params?: any) {
    return apiClient.get('/inventory/products', { params });
  }

  async getLowStockProducts() {
    return apiClient.get('/products/low-stock');
  }

  async getLowStockCount() {
    return apiClient.get('/products/low-stock/count');
  }

  async getPendingProducts() {
    return apiClient.get('/inventory/products/pending');
  }

  async approveProduct(id: string) {
    return apiClient.patch(`/inventory/products/${id}/approve`);
  }

  async rejectProduct(id: string) {
    return apiClient.patch(`/inventory/products/${id}/reject`);
  }

  async updateProduct(id: string, data: any) {
    return apiClient.put(`/inventory/products/${id}`, data);
  }

  async deleteProduct(id: string) {
    return apiClient.delete(`/inventory/products/${id}`);
  }

  /**
   * Categories Management
   */
  async getCategories() {
    return apiClient.get('/inventory/categories');
  }

  async createCategory(data: any) {
    return apiClient.post('/inventory/categories', data);
  }

  async updateCategory(id: string, data: any) {
    return apiClient.put(`/inventory/categories/${id}`, data);
  }

  async deleteCategory(id: string) {
    return apiClient.delete(`/inventory/categories/${id}`);
  }

  /**
   * Subcategory Management
   */
  async createSubcategory(data: any) {
    return apiClient.post('/inventory/subcategories', data);
  }

  async updateSubcategory(id: string, data: any) {
    return apiClient.put(`/inventory/subcategories/${id}`, data);
  }

  async deleteSubcategory(id: string) {
    return apiClient.delete(`/inventory/subcategories/${id}`);
  }

  /**
   * User Management
   */
  async getUsers(params?: any) {
    return apiClient.get('/super-admin/users/all', { params });
  }

  async updateUserRole(id: string, role: string) {
    return apiClient.patch(`/super-admin/users/${id}/role`, { role });
  }

  async deleteUser(id: string) {
    return apiClient.delete(`/super-admin/users/${id}`);
  }

  /**
   * Notifications
   */
  async getNotifications(params?: any) {
    return apiClient.get('/notifications', { params });
  }

  async markAsRead(id: string) {
    return apiClient.patch(`/notifications/${id}/read`);
  }

  async markAllAsRead() {
    return apiClient.patch('/notifications/read-all');
  }
}

export default new AdminService();
