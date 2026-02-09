/**
 * Global TypeScript Definitions
 * Type definitions and interfaces used across the application
 */

import { Request } from 'express';
import { UserRole } from './rbac.types';

/**
 * Extend Express Request globally
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Extended Express Request with user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: UserRole;
  };
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

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * User Roles
 */
export type UserRole = 'admin' | 'customer' | 'dealer' | 'sales';

/**
 * User Status
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending_verification';

/**
 * Order Status
 */
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

/**
 * Product Status
 */
export type ProductStatus = 'active' | 'inactive' | 'out_of_stock';

/**
 * Supported Locales
 */
export type Locale = 'en' | 'ar';
