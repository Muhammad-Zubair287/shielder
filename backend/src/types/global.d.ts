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
        preferredLanguage?: string;
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
    preferredLanguage?: string;
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
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

/**
 * User Status
 */
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

/**
 * Order Status
 */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/**
 * Product Status
 */
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

/**
 * Supported Locales
 */
export type Locale = 'en' | 'ar';
