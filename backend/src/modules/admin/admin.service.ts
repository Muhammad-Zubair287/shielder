/**
 * Admin Service
 * Handles all admin operations for USER management only
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

export class AdminService {
  /**
   * Get all users with search, filter, and pagination
   * Admin can only see USER role
   */
  async getUsers(
    filters: SearchFilter,
    pagination: PaginationParams,
    adminRole: UserRole
  ) {
    // Build where clause
    const where = buildWhereClause(filters);

    // Admin can only see USER role
    if (adminRole === UserRole.ADMIN) {
      where.role = UserRole.USER;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get paginated data
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

    return createPaginatedResponse(
      users,
      total,
      pagination.page,
      pagination.limit
    );
  }

  /**
   * Get single user by ID
   * Admin can only access USER role
   */
  async getUserById(userId: string, adminRole: UserRole) {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        ...(adminRole === UserRole.ADMIN ? { role: UserRole.USER } : {}),
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
   * Create new user
   * Admin can only create USER role
   */
  async createUser(data: {
    email: string;
    password: string;
    role?: UserRole;
    fullName?: string;
    phoneNumber?: string;
    companyName?: string;
  }, createdBy: string, adminRole: UserRole) {
    // Admin can only create USER
    const role = adminRole === UserRole.ADMIN ? UserRole.USER : (data.role || UserRole.USER);

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError('Email already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role,
        status: UserStatus.ACTIVE,
        isActive: true,
        emailVerified: true, // Admin-created users are pre-verified
        createdBy,
        profile: data.fullName || data.phoneNumber || data.companyName ? {
          create: {
            fullName: data.fullName,
            phoneNumber: data.phoneNumber,
            companyName: data.companyName,
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

    return user;
  }

  /**
   * Update user
   * Admin can only update USER role
   */
  async updateUser(
    userId: string,
    data: {
      email?: string;
      fullName?: string;
      phoneNumber?: string;
      companyName?: string;
      status?: UserStatus;
    },
    updatedBy: string,
    adminRole: UserRole
  ) {
    // Verify user exists and is manageable
    const existingUser = await this.getUserById(userId, adminRole);

    // Admin cannot update role
    if (adminRole === UserRole.ADMIN && existingUser.role !== UserRole.USER) {
      throw new ApiError('Cannot update this user', 403);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        status: data.status,
        updatedBy,
        profile: data.fullName || data.phoneNumber || data.companyName ? {
          upsert: {
            create: {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
              companyName: data.companyName,
            },
            update: {
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
              companyName: data.companyName,
            },
          },
        } : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        updatedAt: true,
        profile: true,
      },
    });

    return user;
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(
    userId: string,
    isActive: boolean,
    updatedBy: string,
    adminRole: UserRole
  ) {
    // Verify user exists and is manageable
    await this.getUserById(userId, adminRole);

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
   * Reset user password
   * Admin can reset USER passwords
   */
  async resetUserPassword(
    userId: string,
    newPassword: string,
    updatedBy: string,
    adminRole: UserRole
  ) {
    // Verify user exists and is manageable
    await this.getUserById(userId, adminRole);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        lastPasswordChange: new Date(),
        updatedBy,
      },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Soft delete user
   */
  async deleteUser(userId: string, deletedBy: string, adminRole: UserRole) {
    // Verify user exists and is manageable
    await this.getUserById(userId, adminRole);

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
}

export const adminService = new AdminService();
