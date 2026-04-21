/**
 * Super Admin Service
 * Handles all super admin operations - manages all users including admins
 */

import { UserRole, UserStatus } from '../../common/constants/roles';
import { ApiError } from '../../common/errors/api.error';
import { prisma } from '../../config/database';
import {
  PaginationParams,
  createPaginatedResponse,
} from '../../common/utils/pagination';
import bcrypt from 'bcryptjs';
import { AuditService } from '../../common/services/audit.service';
import redisCacheService from '@/common/services/redis-cache.service';
import { CACHE_KEYS, CACHE_TTL_SECONDS } from '@/common/constants/cache-keys';

export class SuperAdminService {
  private async invalidateDashboardCaches() {
    await Promise.all([
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_DASHBOARD_SUMMARY),
      redisCacheService.del(CACHE_KEYS.SUPERADMIN_MONTHLY_ANALYTICS),
    ]);
  }

  /**
   * Get User Management Stats
   */
  async getUserStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, inactive, newThisMonth] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.user.count({ where: { deletedAt: null, isActive: false } }),
      prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    return {
      totalUsers: total,
      activeUsers: active,
      inactiveUsers: inactive,
      newlyRegistered: newThisMonth,
    };
  }

  /**
   * Get all users with filters and pagination (OPTIMIZED)
   */
  async getAllUsers(filters: any, pagination: PaginationParams) {
    const { search, role, roles, status, dateFrom, dateTo } = filters;

    const where: any = {
      deletedAt: null,
    };

    // OPTIMIZATION: Use a more efficient search strategy
    if (search) {
      const searchLower = search.toLowerCase().trim();
      
      // First try email match (indexed, fastest)
      const emailMatch = await prisma.user.findFirst({
        where: {
          email: { equals: searchLower, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { id: true },
      });

      if (emailMatch) {
        // If exact email found, just use that
        where.id = emailMatch.id;
      } else {
        // Fall back to profile search only if email didn't match
        // This avoids the expensive OR with multiple profile joins
        where.profile = {
          OR: [
            { fullName: { contains: searchLower, mode: 'insensitive' } },
            { phoneNumber: { contains: searchLower, mode: 'insensitive' } },
          ],
        };
      }
    }

    if (role) {
      where.role = role;
    } else if (Array.isArray(roles) && roles.length > 0) {
      where.role = { in: roles };
    }

    if (status) {
      if (status === 'ACTIVE') where.isActive = true;
      if (status === 'INACTIVE' || status === 'SUSPENDED') where.isActive = false;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Fetch total and users in parallel for speed
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
              phoneNumber: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return createPaginatedResponse(users, total, pagination.page, pagination.limit);
  }

  /**
   * Create a new user (Admin, Staff, or Customer)
   */
  async createUser(data: any, createdBy: string) {
    const email = String(data.email || '').trim().toLowerCase();

    // 1. Check if email exists (including soft-deleted users)
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    // Active account with same email: block creation
    if (existing && !existing.deletedAt) {
      throw new ApiError('Registration failed. This email is already registered in our system.', 400);
    }

    // 2. Prevent creating Super Admin
    if (data.role === UserRole.SUPER_ADMIN) {
      throw new ApiError('System protection rule: You cannot create another Super Admin account.', 403);
    }

    // 2b. Admin accounts must use @shielder.com domain
    if (data.role === UserRole.ADMIN && !email.endsWith('@shielder.com')) {
      throw new ApiError('Admin accounts must use an @shielder.com email address.', 400);
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    let user;

    // 4a. Restore archived user with same email instead of creating a duplicate row
    if (existing && existing.deletedAt) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          passwordHash,
          role: data.role || UserRole.USER,
          status: data.status === 'INACTIVE' ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
          isActive: data.status !== 'INACTIVE',
          deletedAt: null,
          updatedBy: createdBy,
          failedLoginAttempts: 0,
          lockedUntil: null,
          resetToken: null,
          resetTokenExpiry: null,
          profile: {
            upsert: {
              create: {
                fullName: data.fullName,
                phoneNumber: data.phoneNumber,
                companyName: data.companyName || 'Shielder',
              },
              update: {
                fullName: data.fullName,
                phoneNumber: data.phoneNumber,
                companyName: data.companyName || 'Shielder',
              },
            },
          },
        },
        include: { profile: true },
      });
    } else {
      // 4b. Create brand new user
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: data.role || UserRole.USER,
          status: data.status === 'INACTIVE' ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
          isActive: data.status !== 'INACTIVE',
          createdBy,
          profile: {
            create: {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
              companyName: data.companyName || 'Shielder',
            },
          },
        },
        include: { profile: true },
      });
    }

    // 5. Audit Log
    await AuditService.log({
      userId: createdBy,
      action: existing && existing.deletedAt ? 'USER_RESTORED' : 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      changes: {
        email: user.email,
        role: user.role,
        mode: existing && existing.deletedAt ? 'RESTORE' : 'CREATE',
      },
    });

    // NEW: Notify Super Admins about new administrative/supplier accounts
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPPLIER) {
      try {
        const NotificationService = (await import('../notification/notification.service')).default;
        await NotificationService.notify({
          type: 'NEW_USER_CREATED',
          title: 'New Account Created',
          message: `A new ${user.role} account has been created for ${user.profile?.fullName || user.email}.`,
          module: 'USER',
          triggeredById: createdBy,
          relatedId: user.id,
          global: true
        });
      } catch (err) {
        console.error('Notification failed for user creation:', err);
      }
    }

    await this.invalidateDashboardCaches();

    return user;
  }

  /**
   * Update User (OPTIMIZED)
   */
  async updateUser(id: string, data: any, updatedBy: string) {
    const targetUser = await prisma.user.findUnique({ 
      where: { id },
      select: {
        id: true,
        role: true,
        status: true,
        isActive: true,
      },
    });
    
    if (!targetUser) throw new ApiError('User not found', 404);

    // 1. Super Admin Protection
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ApiError('Super Admin account is protected and cannot be modified.', 403);
    }

    // 2. Self Protection
    if (id === updatedBy && (data.role || data.isActive === false)) {
      throw new ApiError('Self-protection rule: You cannot change your own role or deactivate yourself.', 403);
    }

    // 3. Prevent Promotion to Super Admin
    if (data.role === UserRole.SUPER_ADMIN) {
      throw new ApiError('System protection rule: Promotion to Super Admin is not allowed.', 403);
    }

    const updateData: any = {
      updatedBy,
    };

    const isStatusUpdate = typeof data.isActive === 'boolean' || typeof data.status === 'string';
    const isSuspending = (data.isActive === false) || data.status === UserStatus.SUSPENDED;
    const isReactivating = (data.isActive === true) || data.status === UserStatus.ACTIVE;

    if (isStatusUpdate) {
      updateData.isActive = isReactivating ? true : false;
      updateData.status = isReactivating ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
      updateData.lockedUntil = isSuspending && data.suspensionUntil ? new Date(data.suspensionUntil) : null;
    }

    if (data.role) updateData.role = data.role;
    if (data.status) {
      updateData.isActive = data.status === 'ACTIVE';
      updateData.status = data.status === 'ACTIVE' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    }

    // Handle Password Update if provided
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    // Use transaction to batch operations
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update profile if needed
      if (data.fullName || data.phoneNumber) {
        await tx.userProfile.update({
          where: { userId: id },
          data: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
          },
        });
      }

      // Update user
      return tx.user.update({
        where: { id },
        data: updateData,
        include: { profile: true },
      });
    });

    // Audit Log
    await AuditService.log({
      userId: updatedBy,
      action: isSuspending ? 'USER_SUSPENDED' : isReactivating ? 'USER_REACTIVATED' : 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      changes: {
        ...data,
        suspensionReason: data.suspensionReason,
        suspensionUntil: data.suspensionUntil ? new Date(data.suspensionUntil).toISOString() : null,
        previousStatus: targetUser.status,
        previousIsActive: targetUser.isActive,
      },
    }).catch(err => console.error('Audit Log failed:', err));

    await this.invalidateDashboardCaches();

    return updatedUser;
  }

  /**
   * Delete User (Soft Delete)
   */
  async deleteUser(
    id: string,
    deletedBy: string,
    options?: { reason?: string; mode?: 'ARCHIVE' | 'PERMANENT' }
  ) {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) throw new ApiError('User not found', 404);

    const reason = options?.reason?.trim();
    const mode = options?.mode || 'ARCHIVE';

    // 1. Super Admin Protection - Nobody can delete a Super Admin account
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      throw new ApiError('System protection: Super Admin accounts cannot be deleted by anyone.', 403);
    }

    // 2. Self Protection
    if (id === deletedBy) {
      throw new ApiError('Self-protection rule: You cannot delete your own account.', 403);
    }

    if (mode === 'PERMANENT') {
      try {
        await prisma.user.delete({ where: { id } });

        await AuditService.log({
          userId: deletedBy,
          action: 'USER_PERMANENTLY_DELETED',
          entityType: 'USER',
          entityId: id,
          changes: {
            mode,
            reason,
            email: targetUser.email,
            role: targetUser.role,
          },
        });

        await this.invalidateDashboardCaches();

        return { success: true, message: 'User permanently deleted successfully.' };
      } catch (error) {
        throw new ApiError(
          'Permanent deletion failed because this account has linked records. Use archive mode instead.',
          400
        );
      }
    }

    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: UserStatus.SUSPENDED,
        updatedBy: deletedBy,
      },
    });

    // Audit Log
    await AuditService.log({
      userId: deletedBy,
      action: 'USER_ARCHIVED',
      entityType: 'USER',
      entityId: id,
      changes: {
        mode,
        reason,
        email: targetUser.email,
        role: targetUser.role,
      },
    });

    await this.invalidateDashboardCaches();

    return { success: true, message: 'User archived successfully.' };
  }

  // --- Keep other methods like getStatistics, getDashboardSummary, etc. ---
  // (I'll add them back to maintain compatibility)

  /**
   * Get Admin Summary
   */
  async getAdminSummary() {
    const [total, active, suspended] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.ADMIN, deletedAt: null } }),
      prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { role: UserRole.ADMIN, isActive: false, deletedAt: null } }),
    ]);
    return { totalAdmins: total, activeAdmins: active, suspendedAdmins: suspended };
  }

  async getStatistics() {
    const [totalUsers, totalAdmins, activeUsers, inactiveUsers] = await Promise.all([
      prisma.user.count({ where: { role: UserRole.USER, deletedAt: null } }),
      prisma.user.count({ where: { role: UserRole.ADMIN, deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { isActive: false, deletedAt: null } }),
    ]);
    return { totalUsers, totalAdmins, activeUsers, inactiveUsers, totalAccounts: totalUsers + totalAdmins };
  }

  async getDashboardSummary() {
    const cachedSummary = await redisCacheService.getJson<{
      totalStock: number;
      totalProducts: number;
      totalOrders: number;
      totalRevenue: number;
      inventoryValue: number;
      totalCategories: number;
      totalUsers: number;
    }>(CACHE_KEYS.SUPERADMIN_DASHBOARD_SUMMARY);

    if (cachedSummary) {
      return cachedSummary;
    }

    const activePublishedFilter = { isActive: true, status: 'PUBLISHED' as const };

    const [totalStockResult, totalProducts, totalOrders, revenueResult, products, totalCategories, totalUsers] = await Promise.all([
      // Only sum stock for active + published products
      prisma.product.aggregate({
        where: activePublishedFilter,
        _sum: { stock: true }
      }),
      // Count active products
      prisma.product.count({ where: { isActive: true } }),
      // Exclude cancelled orders
      prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      // Only sum revenue from paid orders
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true }
      }),
      // Only compute inventory value from active + published products
      prisma.product.findMany({
        where: activePublishedFilter,
        select: { stock: true, price: true }
      }),
      // Count all active categories
      prisma.category.count({ where: { isActive: true } }),
      // Count all non-deleted users for platform KPI card
      prisma.user.count({ where: { deletedAt: null } })
    ]);

    const totalStock = totalStockResult._sum.stock || 0;
    const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);

    const summary = {
      totalStock,
      totalProducts,
      totalOrders,
      totalRevenue: Number(revenueResult._sum.total || 0),
      inventoryValue,
      totalCategories,
      totalUsers
    };

    await redisCacheService.setJson(
      CACHE_KEYS.SUPERADMIN_DASHBOARD_SUMMARY,
      summary,
      CACHE_TTL_SECONDS.SUPERADMIN_DASHBOARD_SUMMARY
    );

    return summary;
  }

  async getMonthlyAnalytics() {
    const cachedAnalytics = await redisCacheService.getJson<Array<{ month: string; orders: number; revenue: number }>>(
      CACHE_KEYS.SUPERADMIN_MONTHLY_ANALYTICS
    );

    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        startDate: new Date(date.getFullYear(), date.getMonth(), 1),
        endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
      };
    }).reverse();

    const stats = await Promise.all(
      lastSixMonths.map(async (m) => {
        const orders = await prisma.order.aggregate({
          where: { createdAt: { gte: m.startDate, lte: m.endDate } },
          _count: { id: true },
          _sum: { total: true },
        });
        return { month: m.month, orders: Number(orders._count.id || 0), revenue: Number(orders._sum.total || 0) };
      })
    );

    await redisCacheService.setJson(
      CACHE_KEYS.SUPERADMIN_MONTHLY_ANALYTICS,
      stats,
      CACHE_TTL_SECONDS.SUPERADMIN_MONTHLY_ANALYTICS
    );

    return stats;
  }

  async getRecentActivity(options?: { window?: 'all' | 'today' | '7d'; limit?: number }) {
    const window = options?.window ?? '7d';
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);

    let createdAtFilter: { gte?: Date } | undefined;
    const now = new Date();
    if (window === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      createdAtFilter = { gte: startOfDay };
    } else if (window === '7d') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      createdAtFilter = { gte: sevenDaysAgo };
    }

    // OPTIMIZATION: Use simpler user select without nested profile include
    const activities = await prisma.auditLog.findMany({
      take: limit,
      where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            email: true,
            profile: {
              select: { fullName: true },
            },
          },
        },
      },
    });

    return activities.map((a) => ({
      id: a.id,
      action: a.action.replace(/_/g, ' '),
      timestamp: a.createdAt,
      user: a.user?.profile?.fullName || a.user?.email || 'System',
      type: this.getActivityType(a.action),
    }));
  }

  private getActivityType(action: string): 'success' | 'pending' | 'issue' {
    const normalized = action.trim().toLowerCase();

    // Explicit failure/error signals should always be treated as issues.
    if (
      normalized.includes('delete') ||
      normalized.includes('reject') ||
      normalized.includes('error') ||
      normalized.includes('fail')
    ) {
      return 'issue';
    }

    // Mark as pending only when the action text itself indicates waiting state.
    if (
      normalized.includes('pending') ||
      normalized.includes('await') ||
      normalized.includes('submitted') ||
      normalized.includes('requested')
    ) {
      return 'pending';
    }

    // All other completed actions (including USER_LOGIN) are successful.
    return 'success';
  }
}

export const superAdminService = new SuperAdminService();
