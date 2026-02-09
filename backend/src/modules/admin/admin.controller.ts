/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import {
  getPaginationParams,
  getSearchFilters,
} from '../../common/utils/pagination';
import { UserRole } from '../../common/constants/roles';

export class AdminController {
  /**
   * GET /api/admin/users
   * Get all users with search, filter, and pagination
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);
      const adminRole = req.user?.role as UserRole;

      const result = await adminService.getUsers(filters, pagination, adminRole);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:id
   * Get single user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminRole = req.user?.role as UserRole;

      const user = await adminService.getUserById(String(id), adminRole);

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/users
   * Create new user
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const adminRole = req.user?.role as UserRole;
      const createdBy = req.user?.id!;

      const user = await adminService.createUser(req.body, createdBy, adminRole);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/users/:id
   * Update user
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminRole = req.user?.role as UserRole;
      const updatedBy = req.user?.id!;

      const user = await adminService.updateUser(String(id), req.body, updatedBy, adminRole);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/status
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const adminRole = req.user?.role as UserRole;
      const updatedBy = req.user?.id!;

      const user = await adminService.updateUserStatus(String(id), isActive, updatedBy, adminRole);

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:id/reset-password
   * Reset user password
   */
  async resetUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const adminRole = req.user?.role as UserRole;
      const updatedBy = req.user?.id!;

      const result = await adminService.resetUserPassword(
        String(id),
        password,
        updatedBy,
        adminRole
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/users/:id
   * Soft delete user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminRole = req.user?.role as UserRole;
      const deletedBy = req.user?.id!;

      const result = await adminService.deleteUser(String(id), deletedBy, adminRole);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
