/**
 * Type definitions for Quotation module
 * Ensures type-safe quotation operations across the codebase
 */

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: QuotationStatus;
  items: QuotationItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

export interface CreateQuotationRequest {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
  validDays?: number;
}

export interface DecideQuotationRequest {
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
}

export interface SendQuotationRequest {
  recipientEmail: string;
  message?: string;
}
