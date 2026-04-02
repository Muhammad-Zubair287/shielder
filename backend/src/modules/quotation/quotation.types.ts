/**
 * Quotation Module Types
 * Type definitions for quotation service and controller
 */

import { QuotationStatus, QuotationActivityType } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ── Quotation Items ───────────────────────────────────────────────────────
export interface QuotationItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

export interface QuotationItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Prisma.Decimal | number;
  discount: Prisma.Decimal | number;
  totalPrice: Prisma.Decimal | number;
}

// ── Quotation Creation ────────────────────────────────────────────────────
export interface CreateQuotationInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  companyName?: string;
  items: QuotationItemInput[];
  discount?: number;
  taxRate?: number;
  notes?: string;
  terms?: string;
  quotationDate?: Date;
  expiryDate: Date;
}

export interface UpdateQuotationInput {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  companyName?: string;
  items?: QuotationItemInput[];
  discount?: number;
  taxRate?: number;
  notes?: string;
  terms?: string;
  expiryDate?: Date;
  status?: QuotationStatus;
}

// ── Quotation Response ────────────────────────────────────────────────────
export interface QuotationResponse {
  id: string;
  quotationNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  companyName?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  status: QuotationStatus;
  quotationDate: Date;
  expiryDate: Date;
  notes?: string;
  terms?: string;
  validUntil: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Quotation Filters and Pagination ──────────────────────────────────────
export interface QuotationFilters {
  status?: QuotationStatus;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface QuotationPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Quotation Conversion to Order ─────────────────────────────────────────
export interface ConvertToOrderInput {
  paymentMethod?: string;
  shippingAddress?: string;
  notes?: string;
}

export interface ConvertToOrderResponse {
  orderId: string;
  quotationId: string;
  orderAmount: number;
  status: string;
}

// ── Quotation Activity ────────────────────────────────────────────────────
export interface QuotationActivity {
  id: string;
  quotationId: string;
  userId: string;
  activityType: QuotationActivityType;
  description: string;
  timestamp: Date;
}

// ── Database Query Results ────────────────────────────────────────────────
export interface QuotationWhereClause {
  status?: QuotationStatus;
  customerId?: string;
  customerEmail?: {
    contains: string;
    mode: 'insensitive';
  };
  quotationNumber?: {
    contains: string;
    mode: 'insensitive';
  };
  quotationDate?: {
    gte?: Date;
    lte?: Date;
  };
}
