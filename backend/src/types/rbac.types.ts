/**
 * RBAC Types and Enums
 * Role-Based Access Control type definitions
 */

/**
 * User Roles - Hierarchical
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * User Status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Role Hierarchy Levels
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.USER]: 1,
};

/**
 * Pagination Request
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Search & Filter Params
 */
export interface UserFilters extends PaginationParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * User Response DTO
 */
export interface UserDTO {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
  };
}

/**
 * Create User Request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
}

/**
 * Update User Request
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  status?: UserStatus;
}

/**
 * Audit Log Action
 */
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  RESET_PASSWORD = 'RESET_PASSWORD',
  ROLE_CHANGE = 'ROLE_CHANGE',
}
