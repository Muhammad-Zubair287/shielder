/**
 * Analytics Service
 * High-performance aggregation logic for Super Admin dashboard
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class AnalyticsService {
  /**
   * Aggregate monthly revenue for the last 12 months
   * Only includes PAID orders
   */
  static async getRevenueMonthly() {
    const result: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        SUM(total)::FLOAT AS revenue
      FROM orders
      WHERE status = 'PAID'
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
    const result: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(id)::INT AS "orderCount"
      FROM orders
      WHERE status != 'CANCELLED'
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    return result;
  }

  /**
   * Aggregate products by category
   * Counts active products per category
   */
  static async getProductsByCategory() {
    // We use standard Prisma groupBy for category counts
    const counts = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        isActive: true,
      },
      _count: {
        id: true,
      },
    });

    // Optionally fetch category names for a better response
    const categoryIds = counts.map((c) => c.categoryId);
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

    return counts.map((c) => {
      const category = categories.find((cat) => cat.id === c.categoryId);
      return {
        categoryId: c.categoryId,
        categoryName: category?.translations[0]?.name || 'Unknown',
        productCount: c._count.id,
      };
    });
  }

  /**
   * Aggregate user growth by month
   */
  static async getUserGrowth() {
    const result: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(id)::INT AS "userCount"
      FROM users
      WHERE deleted_at IS NULL
      AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    return result;
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
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          status: 'PAID',
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
    ]);

    return {
      totalRevenue: Number(revenueAggregate._sum.total || 0),
      totalOrders,
      totalUsers,
      totalProducts,
      totalCategories,
    };
  }
}

export { AnalyticsService };
