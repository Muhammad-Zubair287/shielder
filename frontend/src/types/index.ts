/**
 * TypeScript Type Definitions
 * Global types and interfaces for the frontend application
 */

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  phoneNumber: string | null;
  address: string | null;
  companyName: string | null;
  taxId: string | null;
  preferredLanguage: Locale;
  preferences: any;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

/**
 * Auth Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  companyName?: string;
  role?: 'ADMIN' | 'USER';
  preferredLanguage?: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  stack?: string;
}

/**
 * Product Types
 */
export interface Product {
  id: string;
  sku: string;
  categoryId: string | null;
  basePrice: number;
  stockQuantity: number;
  status: ProductStatus;
  meta: any;
  createdAt: string;
  updatedAt: string;
  translations?: ProductTranslation[];
  category?: Category;
}

export interface ProductTranslation {
  id: string;
  productId: string;
  locale: Locale;
  name: string;
  description: string | null;
  specifications: any;
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string | null;
}

export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

/**
 * Category Types
 */
export interface Category {
  id: string;
  parentId: string | null;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  translations?: CategoryTranslation[];
}

export interface CategoryTranslation {
  id: string;
  categoryId: string;
  locale: Locale;
  name: string;
  description: string | null;
  slug: string | null;
}

/**
 * Order Types
 */
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: any;
  billingAddress: any;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization: any;
  product?: Product;
}

export type OrderType = 'quote' | 'order';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/**
 * Locale Types
 */
export type Locale = 'en' | 'ar';

/**
 * Pagination Types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
