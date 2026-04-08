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
    // Baseline inventory distribution: active products per category.
    const counts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    // Sales distribution: real order counts and revenue per category from order items.
    const orderStats = await prisma.$queryRaw<CategoryOrderStatsRow[]>`
      SELECT
        p."categoryId" AS "categoryId",
        COUNT(DISTINCT oi.order_id)::INT AS "orderCount",
        COALESCE(SUM(oi.total_price), 0)::FLOAT AS "revenue"
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE o.status != 'CANCELLED'
      GROUP BY p."categoryId"
    `;

    const statsByCategoryId = new Map(
      orderStats.map((row) => [
        row.categoryId,
        {
          orderCount: Number(row.orderCount || 0),
          revenue: Number(row.revenue || 0),
        },
      ])
    );

    // Optionally fetch category names for a better response
    const categoryIds = Array.from(
      new Set([
        ...counts.map((c) => c.categoryId),
        ...orderStats.map((s) => s.categoryId),
      ])
    );
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
      include: {
        translations: {
          take: 1,
        },
      },
    });

    const activeCountByCategoryId = new Map(
      counts.map((c) => [c.categoryId, c._count.id])
    );

    return categoryIds.map((categoryId) => {
      const category = categories.find((cat) => cat.id === categoryId);
      const stats = statsByCategoryId.get(categoryId);
      return {
        categoryId,
        categoryName: category?.translations[0]?.name || 'Unknown',
        productCount: activeCountByCategoryId.get(categoryId) ?? 0,
        orderCount: stats?.orderCount ?? 0,
        // Alias used by dashboard mapping fallback.
        orders: stats?.orderCount ?? 0,
        revenue: stats?.revenue ?? 0,
      };
    });
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
