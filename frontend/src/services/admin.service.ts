/**
 * Admin API Service
 * Handles all dashboard-related API calls for Super Admin
 */

import apiClient from './api.service';
import { API_ENDPOINTS } from '@/utils/constants';

type MonthlySalesPoint = {
  month: string;
  revenue: number;
  orders: number;
};

const unwrap = <T = any>(res: any): T => res?.data?.data ?? res?.data ?? res;

const asArray = <T = any>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const getMonthKey = (value: unknown): string => {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getMonthKeyFromRow = (row: any): string => {
  if (!row || typeof row !== 'object') return '';
  return getMonthKey(
    row.month ?? row.date ?? row.period ?? row.createdAt ?? row.created_at ?? row.label
  );
};

const buildLast12MonthKeys = (): string[] => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const keys: string[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(start);
    monthDate.setUTCMonth(start.getUTCMonth() - i);
    keys.push(getMonthKey(monthDate));
  }

  return keys;
};

class AdminService {
  /**
   * Analytics
   */
  async getOverview() {
    return apiClient.get('analytics/overview');
  }

  async getMonthlyRevenue() {
    return apiClient.get('analytics/revenue/monthly');
  }

  async getMonthlyOrders() {
    return apiClient.get('analytics/orders/monthly');
  }

  async getMonthlySalesSeries(): Promise<MonthlySalesPoint[]> {
    const [revenueRes, ordersRes] = await Promise.allSettled([
      this.getMonthlyRevenue(),
      this.getMonthlyOrders(),
    ]);

    const revenueArr =
      revenueRes.status === 'fulfilled' ? asArray<any>(unwrap<any>(revenueRes.value)) : [];
    const ordersArr =
      ordersRes.status === 'fulfilled' ? asArray<any>(unwrap<any>(ordersRes.value)) : [];

    // Fallback for environments where only super-admin monthly analytics is available.
    // This call may fail for admin users; failures are intentionally ignored.
    let monthlyAnalyticsArr: any[] = [];
    if (revenueArr.length === 0 && ordersArr.length === 0) {
      try {
        const analyticsRes = await this.getMonthlyAnalytics();
        monthlyAnalyticsArr = asArray<any>(unwrap<any>(analyticsRes));
      } catch {
        monthlyAnalyticsArr = [];
      }
    }

    const merged: Record<string, MonthlySalesPoint> = {};
    buildLast12MonthKeys().forEach((month) => {
      merged[month] = { month, revenue: 0, orders: 0 };
    });

    revenueArr.forEach((r: any) => {
      const key = getMonthKeyFromRow(r);
      if (!key) return;
      const revenue = Number(
        r.revenue ?? r.totalRevenue ?? r.total ?? r.amount ?? r.value ?? r.sum ?? 0
      );
      merged[key] = {
        month: key,
        revenue: Number.isFinite(revenue) ? revenue : 0,
        orders: merged[key]?.orders ?? 0,
      };
    });

    ordersArr.forEach((o: any) => {
      const key = getMonthKeyFromRow(o);
      if (!key) return;
      const count = Number(
        o.orderCount ?? o.orders ?? o.totalOrders ?? o.value ?? o.count ?? o.order_count ?? 0
      );
      if (merged[key]) {
        merged[key].orders = Number.isFinite(count) ? count : 0;
      } else {
        merged[key] = { month: key, revenue: 0, orders: Number.isFinite(count) ? count : 0 };
      }
    });

    monthlyAnalyticsArr.forEach((item: any) => {
      const key = getMonthKeyFromRow(item);
      if (!key) return;
      const revenue = Number(item.revenue ?? item.totalRevenue ?? item.value ?? 0);
      const orders = Number(item.orders ?? item.orderCount ?? item.totalOrders ?? item.count ?? 0);

      if (!merged[key]) {
        merged[key] = { month: key, revenue: 0, orders: 0 };
      }

      merged[key].revenue = Number.isFinite(revenue) ? revenue : merged[key].revenue;
      merged[key].orders = Number.isFinite(orders) ? orders : merged[key].orders;
    });

    return Object.values(merged).sort((a, b) => a.month.localeCompare(b.month));
  }

  async getQuotationsTotalCount() {
    // Use the analytics endpoint — it returns `total` via parallel prisma.count()
    // calls with no record data fetched, avoiding the wasteful list?limit=1 approach.
    return apiClient.get('quotations/analytics');
  }

  

  async getByCategory() {
    return apiClient.get('analytics/products/by-category');
  }

  async getUserGrowth() {
    return apiClient.get('analytics/users/growth');
  }

  /**
   * Super Admin Dashboard Specific
   */
  async getDashboardSummary() {
    return apiClient.get(API_ENDPOINTS.SUPER_ADMIN.SUMMARY);
  }

  async getMonthlyAnalytics() {
    return apiClient.get(API_ENDPOINTS.SUPER_ADMIN.ANALYTICS_MONTHLY);
  }

  async getActivity() {
    return apiClient.get(API_ENDPOINTS.SUPER_ADMIN.ACTIVITY);
  }

  /**
   * User Management (Universal)
   */
  async getAllUsers(params: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const response = await apiClient.get(API_ENDPOINTS.SUPER_ADMIN.USERS, { params });
    return response.data;
  }

  async getUserManagementStats() {
    const response = await apiClient.get(API_ENDPOINTS.SUPER_ADMIN.USER_STATS);
    return response.data;
  }

  async createUserAccount(data: any) {
    const response = await apiClient.post(API_ENDPOINTS.SUPER_ADMIN.USER_CREATE, data);
    return response.data;
  }

  async updateUserAccount(id: string, data: any) {
    const response = await apiClient.put(API_ENDPOINTS.SUPER_ADMIN.USER_BY_ID(id), data);
    return response.data;
  }

  async deleteUserAccount(id: string) {
    const response = await apiClient.delete(API_ENDPOINTS.SUPER_ADMIN.USER_BY_ID(id));
    return response.data;
  }

  /**
   * Admin → User Management  (ADMIN role, endpoint: /api/admin/users)
   * Backend restricts these to USER-role accounts only.
   */
  async getAdminManagedUsers(params: {
    search?: string;
    status?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN_USERS.BASE, { params });
    return response.data;
  }

  async getAdminManagedUserById(id: string) {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN_USERS.BY_ID(id));
    return response.data;
  }

  async getAdminManagedUserStats() {
    const response = await apiClient.get(`${API_ENDPOINTS.ADMIN_USERS.BASE}/stats`);
    return response.data;
  }

  async createAdminManagedUser(data: {
    email: string;
    password: string;
    fullName?: string;
    phoneNumber?: string;
    companyName?: string;
  }) {
    const response = await apiClient.post(API_ENDPOINTS.ADMIN_USERS.BASE, data);
    return response.data;
  }

  async updateAdminManagedUser(
    id: string,
    data: {
      email?: string;
      fullName?: string;
      phoneNumber?: string;
      companyName?: string;
      status?: string;
    }
  ) {
    const response = await apiClient.put(API_ENDPOINTS.ADMIN_USERS.BY_ID(id), data);
    return response.data;
  }

  async updateAdminManagedUserStatus(id: string, isActive: boolean) {
    const response = await apiClient.patch(API_ENDPOINTS.ADMIN_USERS.STATUS(id), { isActive });
    return response.data;
  }

  async resetAdminManagedUserPassword(id: string, password: string) {
    const response = await apiClient.patch(API_ENDPOINTS.ADMIN_USERS.RESET_PASSWORD(id), { password });
    return response.data;
  }

  async deleteAdminManagedUser(id: string) {
    const response = await apiClient.delete(API_ENDPOINTS.ADMIN_USERS.BY_ID(id));
    return response.data;
  }

  /**
   * Admin Management (Legacy - still used in some places)
   */
  async getAdmins(params: { search?: string; role?: string; status?: string; page?: number; limit?: number }) {
    const response = await apiClient.get(API_ENDPOINTS.ADMINS.BASE, { params });
    return response.data;
  }

  async getAdminSummary() {
    const response = await apiClient.get(API_ENDPOINTS.ADMINS.SUMMARY);
    return response.data;
  }

  async createAdmin(data: any) {
    const response = await apiClient.post(API_ENDPOINTS.ADMINS.BASE, data);
    return response.data;
  }

  async updateAdmin(id: string, data: any) {
    const response = await apiClient.put(API_ENDPOINTS.ADMINS.BY_ID(id), data);
    return response.data;
  }

  async updateAdminStatus(
    id: string,
    data: { isActive: boolean; suspensionReason?: string; suspensionUntil?: string }
  ) {
    const response = await apiClient.patch(API_ENDPOINTS.ADMINS.STATUS(id), data);
    return response.data;
  }

  async deleteAdmin(id: string, data: { reason: string; mode: 'ARCHIVE' | 'PERMANENT' }) {
    const response = await apiClient.delete(API_ENDPOINTS.ADMINS.BY_ID(id), { data });
    return response.data;
  }

  /**
   * Inventory & Products
   */
  async getProducts(params?: any) {
    return apiClient.get(API_ENDPOINTS.PRODUCTS.BASE, { params });
  }

  async getLowStockProducts() {
    return apiClient.get(API_ENDPOINTS.PRODUCTS.LOW_STOCK);
  }

  async getLowStockCount() {
    return apiClient.get(`${API_ENDPOINTS.PRODUCTS.LOW_STOCK}/count`);
  }

  async bulkUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(API_ENDPOINTS.PRODUCTS.BULK_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // Longer timeout for bulk operations
    });
  }

  async downloadProductTemplate() {
    return apiClient.get(API_ENDPOINTS.PRODUCTS.TEMPLATE, {
      responseType: 'blob',
    });
  }

  async getPendingProducts() {
    return apiClient.get('inventory/products/pending');
  }

  /**
   * Categories Management
   */
  async getCategories(params?: any) {
    return apiClient.get('inventory/categories', { params });
  }

  async getCategorySummary() {
    return apiClient.get('inventory/categories/summary');
  }

  async createCategory(formData: FormData) {
    return apiClient.post('inventory/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async updateCategory(id: string, formData: FormData) {
    return apiClient.put(`inventory/categories/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deleteCategory(id: string) {
    return apiClient.delete(`inventory/categories/${id}`);
  }


  /**
   * Subcategory Management
   */
  async getSubcategories(params?: any) {
    return apiClient.get('inventory/subcategories', { params });
  }

  async getSubcategorySummary() {
    return apiClient.get('inventory/subcategories/summary');
  }

  async createSubcategory(formData: FormData) {
    return apiClient.post('inventory/subcategories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async updateSubcategory(id: string, formData: FormData) {
    return apiClient.put(`inventory/subcategories/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async deleteSubcategory(id: string) {
    return apiClient.delete(`inventory/subcategories/${id}`);
  }

  /**
   * Product Management
   */
  async getProductsForManagement(params?: any) {
    return apiClient.get('inventory/products/management', { params });
  }

  async getProductSummary() {
    return apiClient.get('inventory/products/summary');
  }

  async getProductById(id: string) {
    return apiClient.get(`inventory/products/${id}`);
  }

  async createProduct(data: any) {
    return apiClient.post('inventory/products', data);
  }

  async updateProduct(id: string, data: any) {
    return apiClient.put(`inventory/products/${id}`, data);
  }

  async deleteProduct(id: string) {
    return apiClient.delete(`inventory/products/${id}`);
  }

  async uploadProductImage(id: string, file: File) {
    const formData = new FormData();
    formData.append('productImage', file);
    return apiClient.post(`inventory/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async approveProduct(id: string) {
    return apiClient.patch(`inventory/products/${id}/approve`);
  }

  async rejectProduct(id: string) {
    return apiClient.patch(`inventory/products/${id}/reject`);
  }

  /**   * Specification Templates
   */
  async getSpecTemplates(categoryId: string, subcategoryId?: string) {
    return apiClient.get(`inventory/spec-templates/category/${categoryId}`, {
      params: { subcategoryId }
    });
  }

  async createSpecTemplate(data: any) {
    return apiClient.post('inventory/spec-templates', data);
  }

  async deleteSpecTemplate(id: string) {
    return apiClient.delete(`inventory/spec-templates/${id}`);
  }

  /**   * User Management
   */
  async getUsers(params?: any) {
    return apiClient.get('super-admin/users/all', { params });
  }

  async updateUserRole(id: string, role: string) {
    return apiClient.patch(`super-admin/users/${id}/role`, { role });
  }

  async deleteUser(id: string) {
    return apiClient.delete(`super-admin/users/${id}`);
  }

  /**
   * Notifications
   */
  async getNotifications(params?: any) {
    return apiClient.get('notifications', { params });
  }

  async markAsRead(id: string) {
    return apiClient.patch(`notifications/${id}/read`);
  }

  async markAllAsRead() {
    return apiClient.patch('notifications/read-all');
  }

  /**
   * Reports Module
   */
  async getReportsOverview(params: { from: string; to: string }) {
    return apiClient.get('reports/overview', { params });
  }

  async getSalesReport(params: { from: string; to: string; categoryId?: string }) {
    return apiClient.get('reports/sales', { params });
  }

  async getOrderReport(params: { from: string; to: string }) {
    return apiClient.get('reports/orders', { params });
  }

  async getInventoryReport() {
    return apiClient.get('reports/inventory');
  }

  async getPaymentReport(params: { from: string; to: string }) {
    return apiClient.get('reports/payments', { params });
  }

  async getProfitLossReport(params: { from: string; to: string }) {
    return apiClient.get('reports/profit-loss', { params });
  }

  async downloadSalesReport(params: any) {
    return apiClient.get('reports/sales/export', { 
      params, 
      responseType: 'blob' 
    });
  }

  async logReportExport(data: { reportType: string; format: string }) {
    return apiClient.post('reports/export/log', data);
  }
}

export default new AdminService();
