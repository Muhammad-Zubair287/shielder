/**
 * Super Admin Service
 * Handles all super admin operations - manages all users including admins
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../../common/constants/roles';
import { ApiError } from '../../common/errors/api.error';
import {
  SearchFilter,
  PaginationParams,
  buildWhereClause,
  createPaginatedResponse,
} from '../../common/utils/pagination';

const prisma = new PrismaClient();

export class SuperAdminService {
  /**
   * Get all users (including admins and super admins)
   */
  async getAllUsers(filters: SearchFilter, pagination: PaginationParams) {
    const where = buildWhereClause(filters);

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        profile: {
          select: {
            fullName: true,
            phoneNumber: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createPaginatedResponse(users, total, pagination.page, pagination.limit);
  }

  /**
   * Get users only (exclude admins)
   */
  async getUsers(filters: SearchFilter, pagination: PaginationParams) {
    const where = { ...buildWhereClause(filters), role: UserRole.USER };

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return createPaginatedResponse(users, total, pagination.page, pagination.limit);
  }

  /**
   * Get admins only
   */
  async getAdmins(filters: SearchFilter, pagination: PaginationParams) {
    const where = { ...buildWhereClause(filters), role: UserRole.ADMIN };

    const total = await prisma.user.count({ where });

    const admins = await prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return createPaginatedResponse(admins, total, pagination.page, pagination.limit);
  }

  /**
   * Get user by ID (any role)
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        lastPasswordChange: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        profile: true,
      },
    });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    return user;
  }

  /**
   * Create admin account
   */
  async createAdmin(
    data: {
      email: string;
      password: string;
      fullName?: string;
      phoneNumber?: string;
    },
    createdBy: string
  ) {
    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError('Email already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create admin
    const admin = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        isActive: true,
        emailVerified: true,
        createdBy,
        profile: data.fullName || data.phoneNumber ? {
          create: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
          },
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        createdAt: true,
        profile: true,
      },
    });

    return admin;
  }

  /**
   * Update user role (Super Admin only)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole,
    updatedBy: string
  ) {
    // Prevent changing own role
    if (userId === updatedBy) {
      throw new ApiError('Cannot change your own role', 400);
    }

    // Check if user exists
    await this.getUserById(userId);

    // Update role
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
        updatedBy,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Update user/admin status
   */
  async updateUserStatus(
    userId: string,
    isActive: boolean,
    updatedBy: string
  ) {
    // Prevent disabling own account
    if (userId === updatedBy) {
      throw new ApiError('Cannot change your own status', 400);
    }

    await this.getUserById(userId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        status: isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        updatedBy,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        status: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Delete user/admin
   */
  async deleteUser(userId: string, deletedBy: string) {
    // Prevent deleting own account
    if (userId === deletedBy) {
      throw new ApiError('Cannot delete your own account', 400);
    }

    await this.getUserById(userId);

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: deletedBy,
      },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get system statistics
   */
  async getStatistics() {
    const [totalUsers, totalAdmins, activeUsers, inactiveUsers] = await Promise.all([
      prisma.user.count({
        where: { role: UserRole.USER, deletedAt: null },
      }),
      prisma.user.count({
        where: { role: UserRole.ADMIN, deletedAt: null },
      }),
      prisma.user.count({
        where: { isActive: true, deletedAt: null },
      }),
      prisma.user.count({
        where: { isActive: false, deletedAt: null },
      }),
    ]);

    return {
      totalUsers,
      totalAdmins,
      activeUsers,
      inactiveUsers,
      totalAccounts: totalUsers + totalAdmins,
    };
  }
}

export const superAdminService = new SuperAdminService();
