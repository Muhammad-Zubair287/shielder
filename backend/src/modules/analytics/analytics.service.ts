/**
 * Analytics Service
 * High-performance aggregation logic for Super Admin dashboard
 */

import { prisma } from '@/config/database';

type RevenueMonthlyRow = {
  month: Date;
  revenue: number;
};

type OrdersMonthlyRow = {
  month: Date;
  orderCount: number;
};

type UserGrowthRow = {
  month: Date;
  userCount: number;
};

type CategoryOrderStatsRow = {
  categoryId: string;
  orderCount: number;
  revenue: number;
};

class AnalyticsService {
  /**
   * Aggregate monthly revenue for the last 12 months
   * Only includes PAID orders
   */
  static async getRevenueMonthly() {
    const result = await prisma.$queryRaw<RevenueMonthlyRow[]>`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total)::FLOAT AS revenue
      FROM orders
      WHERE payment_status = 'PAID'
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    return result;
  }

  /**
   * Aggregate monthly order counts for the last 12 months
   * Excludes CANCELLED orders
   */
  static async getOrdersMonthly() {
    const result = await prisma.$queryRaw<OrdersMonthlyRow[]>`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(id)::INT AS "orderCount"
      FROM orders
      WHERE status != 'CANCELLED'
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    return result.map(r => ({ ...r, orderCount: Number(r.orderCount) }));
  }

  /**
   * Aggregate products by category
   * Returns active product count plus true order/revenue contribution per category.
   * Order count is based on distinct orders containing items from that category,
   * excluding cancelled orders.
   */
  static async getProductsByCategory() {
    const result = await prisma.$queryRaw<Array<{
      categoryId: string;
      categoryName: string;
      productCount: number | string;
      orderCount: number | string;
      orders: number | string;
      revenue: number | string;
    }>>`
      WITH active_products AS (
        SELECT
          p."categoryId" AS "categoryId",
          COUNT(*)::INT AS "productCount"
        FROM products p
        WHERE p.is_active = true
        GROUP BY p."categoryId"
      ),
      category_sales AS (
        SELECT
          p."categoryId" AS "categoryId",
          COUNT(DISTINCT oi.order_id)::INT AS "orderCount",
          COALESCE(SUM(oi.total_price), 0)::FLOAT AS revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE o.status != 'CANCELLED'
        GROUP BY p."categoryId"
      )
      SELECT
        c.id AS "categoryId",
        COALESCE(ct.name, 'Unknown') AS "categoryName",
        COALESCE(ap."productCount", 0)::INT AS "productCount",
        COALESCE(cs."orderCount", 0)::INT AS "orderCount",
        COALESCE(cs."orderCount", 0)::INT AS orders,
        COALESCE(cs.revenue, 0)::FLOAT AS revenue
      FROM categories c
      LEFT JOIN category_translations ct
        ON ct."categoryId" = c.id AND ct.locale = 'en'
      LEFT JOIN active_products ap ON ap."categoryId" = c.id
      LEFT JOIN category_sales cs ON cs."categoryId" = c.id
      WHERE ap."categoryId" IS NOT NULL OR cs."categoryId" IS NOT NULL
      ORDER BY COALESCE(cs."orderCount", 0) DESC, c.id ASC
    `;

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
    const result = await prisma.$queryRaw<UserGrowthRow[]>`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(id)::INT AS "userCount"
      FROM users
      WHERE deleted_at IS NULL
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    return result.map(r => ({ ...r, userCount: Number(r.userCount) }));
  }

  /**
   * Get overall dashboard statistics
   */
  static async getOverview() {
    const [
      revenueAggregate,
      totalOrders,
      totalUsers,
      totalProducts,
      totalCategories,
      stockAggregate,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
        },
        _sum: {
          total: true,
        },
      }),
      prisma.order.count({
        where: {
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.user.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.product.count({
        where: {
          isActive: true,
        },
      }),
      prisma.category.count(),
      prisma.product.aggregate({
        where: { isActive: true },
        _sum: { stock: true },
      }),
    ]);

    // inventoryValue = SUM(stock * price) via raw query
    const inventoryValueResult = await prisma.$queryRaw<{ value: string }[]>`
      SELECT COALESCE(SUM(stock * price), 0)::TEXT AS value
      FROM products
      WHERE is_active = true
    `;
    const inventoryValue = Number(inventoryValueResult[0]?.value || 0);

    return {
      totalRevenue: Number(revenueAggregate._sum.total || 0),
      totalOrders,
      totalUsers,
      totalProducts,
      totalCategories,
      totalStock: stockAggregate._sum.stock || 0,
      inventoryValue,
    };
  }
}

export { AnalyticsService };
