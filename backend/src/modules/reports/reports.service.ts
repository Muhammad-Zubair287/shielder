/**
 * Reports Service
 * handles complex data aggregation for various enterprise reports
 */

import { prisma } from '../../config/database';
import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../common/services/audit.service';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import {
  OverviewSummaryResponse,
  SalesReportResponse,
  SalesReportFilters,
  InventoryReportResponse,
  ExportFormat,
  RawSalesTrendRow,
  RawOrderTrendRow,
  RawQueryResult,
  ReportDateRange,
  RawStockMovementRecord,
} from './reports.types';
import { reportsRepository } from './reports.repository';

export class ReportsService {
  /**
   * 1. Dashboard Overview Summary
   */
  async getOverviewSummary(dateRange: ReportDateRange): Promise<OverviewSummaryResponse> {
    const { from, to } = dateRange;

    const [salesData, ordersData, refundsData, expensesRaw, inventoryValue] = await Promise.all([
      // Total Sales (Sum of PAID payments)
      reportsRepository.getPaidSalesAggregate(from, to),
      // Total Orders count
      reportsRepository.countOrders(from, to),
      // Total Refunds
      reportsRepository.getRefundAggregate(from, to),
      // Expenses (queried via raw SQL to avoid unsafe client casting)
      prisma.$queryRaw<{ total: number | string | null }[]>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date >= ${from} AND date <= ${to}
      `,
      // Inventory Value (Using stock count for now)
      reportsRepository.getInventoryStockAggregate()
    ]);

    const totalSales = Number(salesData._sum.amount) || 0;
    const totalRefunds = Number(refundsData._sum.amount) || 0;
    const totalExpenses = Number(expensesRaw[0]?.total) || 0;
    const totalRevenue = totalSales - totalRefunds;
    const netProfit = totalRevenue - totalExpenses;

    const [lowStockRaw, salesTrendRaw] = (await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*)::INT as count FROM products WHERE is_active = true AND stock <= minimum_stock_threshold AND stock > 0`,
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          SUM(CASE WHEN status = 'PAID' THEN amount WHEN status = 'REFUNDED' THEN -amount ELSE 0 END)::FLOAT as amount
        FROM payments
        WHERE status IN ('PAID', 'REFUNDED') AND created_at >= ${from} AND created_at <= ${to}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    ])) as [RawQueryResult[], RawSalesTrendRow[]];

    return {
      summary: {
        totalSales,
        orderCount: ordersData,
        avgOrderValue: ordersData > 0 ? totalSales / ordersData : 0,
        inventoryValue: Number(inventoryValue._sum.stock) || 0,
        totalRevenue,
        totalRefunds,
        totalExpenses,
        netProfit,
        lowStockProducts: Number(lowStockRaw[0]?.count) || 0,
      },
      salesTrend: salesTrendRaw.map((t) => ({ ...t, amount: Number(t.amount) }))
    };
  }

  /**
   * 2. Sales Report
   */
  async getSalesReport(filters: SalesReportFilters): Promise<SalesReportResponse> {
    const { from, to, categoryId, paymentStatus, orderStatus } = filters;
    const salesConditions: Prisma.Sql[] = [
      Prisma.sql`o.created_at >= ${from}`,
      Prisma.sql`o.created_at <= ${to}`,
    ];

    if (orderStatus) salesConditions.push(Prisma.sql`o.status = CAST(${orderStatus} AS "OrderStatus")`);
    if (paymentStatus) salesConditions.push(Prisma.sql`o."paymentStatus" = CAST(${paymentStatus} AS "PaymentStatus")`);

    const categoryCondition = categoryId
      ? Prisma.sql` AND p."categoryId" = ${categoryId}`
      : Prisma.sql``;

    const baseWhere = Prisma.sql`WHERE ${Prisma.join(salesConditions, ' AND ')}`;

    // For Sales by Date, if categoryId is present, we need to join with items
    const [salesByDateRaw, salesByCategoryRaw, salesByProductRaw, topProductsRaw] = await Promise.all([
      // Sales by Date (Line Chart)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', o.created_at) as date,
          COALESCE(${categoryId ? Prisma.sql`SUM(oi.total_price)` : Prisma.sql`SUM(o.total)`}, 0)::FLOAT as amount
        FROM orders o
        ${categoryId ? Prisma.sql`JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id` : Prisma.sql``}
        ${baseWhere}
        ${categoryCondition}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      // Sales by Category (Pie Chart)
      prisma.$queryRaw`
        SELECT 
          ct.name,
          COALESCE(SUM(oi.total_price), 0)::FLOAT as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN category_translations ct ON p."categoryId" = ct."categoryId" AND ct.locale = 'en'
        JOIN orders o ON oi.order_id = o.id
        ${baseWhere}
        ${categoryCondition}
        GROUP BY ct.name
      `,
      // Sales by Product (Table)
      prisma.$queryRaw`
        SELECT 
          p.id,
          COALESCE(pt.name, 'Untitled Product') as "name",
          COALESCE(ct.name, 'Uncategorized') as "categoryName",
          COALESCE(SUM(oi.quantity), 0)::INT as "quantitySold",
          COALESCE(SUM(oi.total_price), 0)::FLOAT as "totalRevenue"
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_translations pt ON p.id = pt."productId" AND pt.locale = 'en'
        LEFT JOIN category_translations ct ON p."categoryId" = ct."categoryId" AND ct.locale = 'en'
        JOIN orders o ON oi.order_id = o.id
        ${baseWhere}
        ${categoryCondition}
        GROUP BY p.id, pt.name, ct.name
        ORDER BY "totalRevenue" DESC
      `,
      // Top 10 Best-Selling Products
      prisma.$queryRaw`
        SELECT 
          COALESCE(pt.name, 'Untitled Product') as name,
          COALESCE(SUM(oi.quantity), 0)::INT as sales
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_translations pt ON p.id = pt."productId" AND pt.locale = 'en'
        JOIN orders o ON oi.order_id = o.id
        ${baseWhere}
        ${categoryCondition}
        GROUP BY 1
        ORDER BY sales DESC
        LIMIT 10
      `
    ]);

    const salesByDate = (salesByDateRaw as Array<{ date: Date; amount: number | string }>).map(d => ({
      ...d,
      amount: Number(d.amount),
    }));
    const salesByCategory = (salesByCategoryRaw as Array<{ name: string; revenue: number | string }>).map(c => ({
      ...c,
      revenue: Number(c.revenue),
    }));
    const salesByProduct = (salesByProductRaw as Array<{
      id: string;
      name: string;
      categoryName: string;
      quantitySold: number | string;
      totalRevenue: number | string;
    }>).map(p => ({
      ...p,
      quantitySold: Number(p.quantitySold),
      totalRevenue: Number(p.totalRevenue),
    }));
    const topSellingProducts = (topProductsRaw as Array<{ name: string; sales: number | string }>).map(p => ({
      name: p.name,
      sales: Number(p.sales),
    }));

    // Calculate Summary
    const totalRevenue = salesByCategory.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalUnitsSold = salesByProduct.reduce((acc, curr) => acc + curr.quantitySold, 0);
    const productCount = salesByProduct.length;

    return {
      summary: {
        totalRevenue,
        totalUnitsSold,
        productCount,
        averageOrderValue: salesByDate.length > 0 ? totalRevenue / salesByDate.length : 0 
      },
      salesByDate,
      salesByCategory,
      salesByProduct,
      topSellingProducts
    };
  }

  /**
   * Export Sales Report
   */
  async exportSalesReport(data: SalesReportResponse, format: ExportFormat) {
    if (format === 'excel' || format === 'csv') {
      const salesByProduct = data.salesByProduct ?? [];
      const worksheet = XLSX.utils.json_to_sheet(salesByProduct);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales By Product');
      
      if (format === 'csv') {
        return XLSX.write(workbook, { bookType: 'csv', type: 'buffer' });
      }
      return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }

    if (format === 'pdf') {
      return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        doc.fontSize(20).text('Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(16).text('Top 10 Selling Products');
        data.topSellingProducts.forEach((p, i: number) => {
          const count = 'sales' in p ? p.sales : p.unitsSold;
          doc.fontSize(10).text(`${i + 1}. ${p.name}: ${count ?? 0} sales`);
        });

        doc.moveDown();
        doc.fontSize(16).text('Sales by Category');
        data.salesByCategory.forEach((c) => {
          const categoryName = 'categoryName' in c ? c.categoryName : c.name;
          const categoryRevenue = Number('totalRevenue' in c ? c.totalRevenue : c.revenue);
          doc.fontSize(10).text(`${categoryName}: $${categoryRevenue.toFixed(2)}`);
        });

        doc.end();
      });
    }

    throw new Error('Unsupported format');
  }

  /**
   * 3. Order Report
   */
  async getOrderReport(
    from: Date,
    to: Date,
    filters?: {
      orderStatus?: OrderStatus;
      paymentStatus?: PaymentStatus;
      categoryId?: string;
    }
  ) {
    const where: {
      createdAt: { gte: Date; lte: Date };
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
    } = {
      createdAt: { gte: from, lte: to },
    };

    if (filters?.orderStatus) where.status = filters.orderStatus;
    if (filters?.paymentStatus) where.paymentStatus = filters.paymentStatus;

    const stats = await prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });

    const paymentStats = await prisma.order.groupBy({
      by: ['paymentStatus'],
      where,
      _count: { id: true },
      _sum: { total: true },
    });

    const trendConditions: Prisma.Sql[] = [
      Prisma.sql`created_at >= ${from}`,
      Prisma.sql`created_at <= ${to}`,
    ];
    if (filters?.orderStatus) {
      trendConditions.push(Prisma.sql`status = CAST(${filters.orderStatus} AS "OrderStatus")`);
    }
    if (filters?.paymentStatus) {
      trendConditions.push(Prisma.sql`payment_status = CAST(${filters.paymentStatus} AS "PaymentStatus")`);
    }

    const trend: RawOrderTrendRow[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(id)::INT as count,
        COALESCE(SUM(total), 0)::FLOAT as total
      FROM orders
      WHERE ${Prisma.join(trendConditions, ' AND ')}
      GROUP BY date
      ORDER BY date ASC
    `;

    const recentLargeOrders = await prisma.order.findMany({
      where,
      take: 10,
      orderBy: { total: 'desc' },
      include: {
        users: { 
          include: { profile: { select: { fullName: true } } }
        }
      }
    });

    const totalOrders = recentLargeOrders.length > 0
      ? await prisma.order.count({ where })
      : await prisma.order.count({ where });

    const totals = await prisma.order.aggregate({
      where,
      _sum: { total: true },
      _avg: { total: true },
    });

    const statsMap = stats.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.status] = curr._count.id || 0;
      return acc;
    }, {});

    const trendSeries = trend.map((t) => ({ ...t, count: Number(t.count), total: Number(t.total) }));

    const recentOrders = recentLargeOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName || o.users?.profile?.fullName || 'Guest',
        createdAt: o.createdAt,
        totalAmount: Number(o.total)
      }));

    return {
      stats: statsMap,
      trend: trendSeries,
      recentLargeOrders: recentOrders,
      // Additive aggregation fields for enhanced reporting (backward compatible).
      summary: {
        totalOrders,
        totalValue: Number(totals._sum.total) || 0,
        averageOrderValue: Number(totals._avg.total) || 0,
        paymentBreakdown: paymentStats.reduce(
          (acc, curr) => ({
            ...acc,
            [curr.paymentStatus]: {
              count: curr._count.id || 0,
              amount: Number(curr._sum.total) || 0,
            },
          }),
          {}
        ),
      },
    };
  }

  /**
   * 4. Inventory Report
   */
  async getInventoryReport(): Promise<InventoryReportResponse> {
    const [currentStock, avgStock, lowStockProducts, soldUnitsRaw] = await Promise.all([
      // Current stock total (legacy-compatible inventory value).
      prisma.product.aggregate({
        where: { isActive: true },
        _sum: { stock: true },
      }),
      prisma.product.aggregate({
        where: { isActive: true },
        _avg: { stock: true },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          stock: true,
          minimumStockThreshold: true,
          translations: {
            where: { locale: 'en' },
            select: { name: true },
            take: 1,
          },
          stockHistory: {
            where: { type: 'RESTOCK' },
            select: { created_at: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { stock: 'asc' },
        take: 200,
      }),
      prisma.stock_history.aggregate({
        where: { type: 'ORDER_COMPLETED' },
        _sum: { quantity: true },
      }),
    ]);

    const movementRows = (await prisma.$queryRaw<Array<{
      date: Date;
      quantity: number;
      type: string;
      reference: string | null;
    }>>`
      SELECT
        created_at as date,
        quantity,
        type,
        COALESCE(note, 'system') as reference
      FROM stock_history
      ORDER BY created_at DESC
      LIMIT 20
    `) as RawStockMovementRecord[];

    const soldUnits = Math.abs(Number(soldUnitsRaw._sum.quantity) || 0);
    const averageStock = Number(avgStock._avg.stock) || 0;
    const turnoverRate = averageStock > 0 ? soldUnits / averageStock : 0;

    const normalizedLowStockProducts = lowStockProducts
      .filter((p) => p.stock <= p.minimumStockThreshold)
      .slice(0, 20);

    return {
      lowStockProducts: normalizedLowStockProducts.map((p) => ({
        productId: p.id,
        name: p.translations[0]?.name || 'Unnamed Product',
        currentStock: p.stock,
        minimumThreshold: p.minimumStockThreshold,
        reorderQuantity: Math.max(p.minimumStockThreshold * 2 - p.stock, p.minimumStockThreshold),
        lastRestocked: p.stockHistory[0]?.created_at ?? null,
      })),
      stockMovement: movementRows,
      totalInventoryValue: Number(currentStock._sum.stock) || 0,
      turnoverRate,
    };
  }

  /**
   * 5. Payment Report
   */
  async getPaymentReport(
    from: Date,
    to: Date,
    filters?: {
      status?: PaymentStatus;
      method?: PaymentMethod;
    }
  ) {
    const where: Prisma.PaymentWhereInput = {
      createdAt: { gte: from, lte: to },
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.method) where.method = filters.method as PaymentMethod;

    const [stats, trend] = await Promise.all([
      prisma.payment.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          SUM(CASE WHEN status = 'PAID' THEN amount WHEN status = 'REFUNDED' THEN -amount ELSE 0 END)::FLOAT as amount
        FROM payments
        WHERE status IN ('PAID', 'REFUNDED') AND created_at >= ${from} AND created_at <= ${to}
        GROUP BY date
        ORDER BY date ASC
      `
    ]);

    const methodBreakdown = await prisma.payment.groupBy({
      by: ['method'],
      where,
      _sum: { amount: true },
      _count: { id: true },
    });

    const totals = await prisma.payment.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
      _count: { id: true },
    });

    return {
      stats: stats.reduce((acc, curr) => ({ 
        ...acc, 
        [curr.status]: { 
          amount: Number(curr._sum.amount) || 0, 
          count: curr._count.id || 0 
        } 
      }), {}),
      revenueTrend: (trend as Array<{ date: Date; amount: number | string }>).map(t => ({ ...t, amount: Number(t.amount) })),
      // Additive fields for richer analytics without changing existing keys.
      summary: {
        totalPayments: totals._count.id || 0,
        totalAmount: Number(totals._sum.amount) || 0,
        averagePayment: Number(totals._avg.amount) || 0,
      },
      byMethod: methodBreakdown.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.method]: {
            count: curr._count.id || 0,
            amount: Number(curr._sum.amount) || 0,
          },
        }),
        {}
      ),
    };
  }

  /**
   * 6. Profit & Loss Report
   */
  async getProfitLossReport(from: Date, to: Date) {
    const [salesData, refundsData, expensesData] = await Promise.all([
      prisma.payment.aggregate({
        where: { 
          status: PaymentStatus.PAID,
          createdAt: { gte: from, lte: to }
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { 
          status: PaymentStatus.REFUNDED,
          createdAt: { gte: from, lte: to }
        },
        _sum: { amount: true }
      }),
      prisma.$queryRaw<{ total: number | string | null }[]>`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date >= ${from} AND date <= ${to}
      `
    ]);

    const totalSales = Number(salesData._sum.amount) || 0;
    const totalRefunds = Number(refundsData._sum.amount) || 0;
    const totalRevenue = totalSales - totalRefunds;
    const totalExpenses = Number(expensesData[0]?.total) || 0;
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalSales,
      totalRefunds,
      totalRevenue,
      totalExpenses,
      netProfit,
      period: { from, to }
    };
  }

  /**
   * Log Export Actions
   */
  async logExport(userId: string, reportType: string, format: string) {
    await AuditService.log({
      userId,
      action: 'REPORT_EXPORTED',
      entityType: 'REPORT',
      entityId: reportType,
      changes: { format, timestamp: new Date() }
    });
  }
}
