// ── Order module shared types ─────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'READY_FOR_PICKUP'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIAL'
  | 'REFUNDED'
  | 'FAILED'
  | 'PENDING';

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'ONLINE';

export type DeliveryType = 'DELIVERY' | 'PICKUP';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  product?: {
    id: string;
    sku?: string;
    mainImage?: string | null;
    stock?: number;
    translations?: { locale: string; name: string; description?: string }[];
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryType?: DeliveryType;
  warehouseId?: string | null;
  warehouse?: {
    id: string;
    name?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  customerName: string;
  phoneNumber?: string;
  shippingAddress: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  /** Backend relation name is "users" (Prisma many-to-one) */
  users?: {
    email: string;
    profile?: { fullName?: string; phoneNumber?: string };
  };
  orderItems?: OrderItem[];
  _count?: { orderItems: number };
}

export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

// ── Create-order form state ───────────────────────────────────────────────────

export interface OrderFormItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  stock: number;
  quantity: number;
  mainImage?: string | null;
}

export interface CreateOrderPayload {
  userId: string;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  paymentMethod: string;
  items: { productId: string; quantity: number }[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

// ── Customer option ───────────────────────────────────────────────────────────

export interface CustomerOption {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
}

// ── Product option (from management endpoint) ─────────────────────────────────

export interface ProductOption {
  id: string;
  sku?: string;
  price: number;
  stock: number;
  mainImage?: string | null;
  translations?: { locale: string; name: string }[];
  name?: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  totalPages?: number;
}
