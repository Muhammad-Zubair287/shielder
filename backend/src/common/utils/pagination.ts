/**
 * Pagination and Filtering Utilities
 */

import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchFilter {
  search?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Extract pagination params from request
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit as string) || 10)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Extract search and filter params
 */
export function getSearchFilters(req: Request): SearchFilter {
  const filters: SearchFilter = {};

  // Search query
  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  // Role filter
  if (req.query.role) {
    filters.role = req.query.role as string;
  }

  // Status filter
  if (req.query.status) {
    filters.status = req.query.status as string;
  }

  // Active status filter
  if (req.query.isActive !== undefined) {
    filters.isActive = req.query.isActive === 'true';
  }

  // Date range filters
  if (req.query.dateFrom) {
    filters.dateFrom = new Date(req.query.dateFrom as string);
  }

  if (req.query.dateTo) {
    filters.dateTo = new Date(req.query.dateTo as string);
  }

  return filters;
}

/**
 * Build Prisma where clause from filters
 */
export function buildWhereClause(filters: SearchFilter) {
  const where: any = {
    deletedAt: null, // Exclude soft-deleted users
  };

  // Search by name or email
  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      {
        profile: {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  // Role filter
  if (filters.role) {
    where.role = filters.role;
  }

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo;
    }
  }

  return where;
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
