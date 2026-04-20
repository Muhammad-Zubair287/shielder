/**
 * Analytics Service
 * High-performance aggregation logic for Super Admin dashboard
 */

import { analyticsRepository } from './analytics.repository';

class AnalyticsService {
  /**
   * Aggregate monthly revenue for the last 12 months
   * Only includes PAID orders
   */
  static async getRevenueMonthly() {
    return analyticsRepository.getRevenueMonthly();
  }

  /**
   * Aggregate monthly order counts for the last 12 months
   * Excludes CANCELLED orders
   */
  static async getOrdersMonthly() {
    const result = await analyticsRepository.getOrdersMonthly();
    return result.map(r => ({ ...r, orderCount: Number(r.orderCount) }));
  }

  /**
   * Aggregate products by category
   * Returns active product count plus true order/revenue contribution per category.
   * Order count is based on distinct orders containing items from that category,
   * excluding cancelled orders.
   */
  static async getProductsByCategory() {
    const result = await analyticsRepository.getProductsByCategory();
    return result.map((row) => ({
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      productCount: Number(row.productCount || 0),
      orderCount: Number(row.orderCount || 0),
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    }));
  }

  /**
   * Aggregate user growth by month
   */
  static async getUserGrowth() {
    const result = await analyticsRepository.getUserGrowth();
    return result.map(r => ({ ...r, userCount: Number(r.userCount) }));
  }

  /**
   * Get overall dashboard statistics
   */
  static async getOverview() {
    return analyticsRepository.getOverview();
  }
}

export { AnalyticsService };
