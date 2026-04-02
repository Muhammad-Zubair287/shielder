/**
 * Reports Module Types
 * Comprehensive type definitions for reports service and controller
 */

import { PaymentStatus, OrderStatus } from '@prisma/client';

// ── Time-series data ──────────────────────────────────────────────────────
export interface SalesTrendPoint {
  date: Date;
  amount: number;
}

export interface OrderTrendPoint {
  date: Date;
  count: number;
  total: number;
}

export interface StockMovementRecord {
  date: Date;
  quantity: number;
  type: string;
  reference: string;
}

// ── Summary data ──────────────────────────────────────────────────────────
export interface DashboardSummary {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  inventoryValue: number;
  totalRevenue: number;
  totalRefunds: number;
  totalExpenses: number;
  netProfit: number;
  lowStockProducts: number;
}

export interface OverviewSummaryResponse {
  summary: DashboardSummary;
  salesTrend: SalesTrendPoint[];
}

// ── Product info ──────────────────────────────────────────────────────────
export interface TopSellingProduct {
  productId?: string;
  name: string;
  totalOrders?: number;
  totalRevenue?: number;
  unitsSold?: number;
  sales?: number;
}

export interface SalesByCategory {
  categoryId?: string;
  categoryName?: string;
  totalRevenue?: number;
  unitsSold?: number;
  percentage?: number;
  name?: string;
  revenue?: number;
}

// ── Order info ────────────────────────────────────────────────────────────
export interface RecentLargeOrder {
  orderId: string;
  orderDate: Date;
  customerName: string;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}

// ── Sales Report ──────────────────────────────────────────────────────────
export interface SalesReportResponse {
  summary: {
    totalRevenue?: number;
    totalOrders?: number;
    avgOrderValue?: number;
    totalRefunds?: number;
    totalUnitsSold?: number;
    productCount?: number;
    averageOrderValue?: number;
  };
  orderTrend?: OrderTrendPoint[];
  recentLargeOrders?: RecentLargeOrder[];
  salesByDate?: Array<{ date: Date; amount: number }>;
  salesByProduct?: Array<{ id: string; name: string; categoryName: string; quantitySold: number; totalRevenue: number }>;
  topSellingProducts: TopSellingProduct[];
  salesByCategory: SalesByCategory[];
}

// ── Inventory Report ──────────────────────────────────────────────────────
export interface LowStockProduct {
  productId: string;
  name: string;
  currentStock: number;
  minimumThreshold: number;
  reorderQuantity: number;
  lastRestocked: Date | null;
}

export interface InventoryReportResponse {
  lowStockProducts: LowStockProduct[];
  stockMovement: StockMovementRecord[];
  totalInventoryValue: number;
  turnoverRate: number;
}

// ── Filter and pagination types ───────────────────────────────────────────
export interface ReportDateRange {
  from: Date;
  to: Date;
}

export interface SalesReportFilters extends ReportDateRange {
  categoryId?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
}

export interface InventoryReportFilters extends ReportDateRange {
  categoryId?: string;
  minStock?: number;
  status?: 'low' | 'adequate' | 'excess';
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Export formats ────────────────────────────────────────────────────────
export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  filename: string;
  format: ExportFormat;
  sheetName?: string;
}

// ── Raw database query results ────────────────────────────────────────────
export interface RawSalesTrendRow {
  date: Date;
  amount: string | number | null; // Decimal becomes string in some drivers
}

export interface RawOrderTrendRow {
  date: Date;
  count: string | number;
  total: string | number;
}

export interface RawStockMovementRow {
  date: Date;
  quantity: number;
  type: string;
  reference: string;
}

export interface RawStockMovementRecord extends RawStockMovementRow {
  created_at?: Date;
  updated_at?: Date;
  product?: {
    translations?: Array<{ name: string; description?: string }>;
  };
}

export interface RawQueryResult {
  [key: string]: string | number | boolean | Date | null;
}

// ── Report metadata ──────────────────────────────────────────────────────
export interface ReportMetadata {
  generatedAt: Date;
  generatedBy: string;
  dateRange: ReportDateRange;
  filters: Record<string, string | number | boolean | null | undefined>;
  format: ExportFormat;
  version: string;
}
