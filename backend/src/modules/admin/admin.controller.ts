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
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Get all users (Admin/Super Admin only)
   *     tags: [Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer }
   *       - in: query
   *         name: limit
   *         schema: { type: integer }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: List of users
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
   * @swagger
   * /api/admin/users/{id}:
   *   get:
   *     summary: Get user by ID (Admin only)
   *     tags: [Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: User data
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
   * @swagger
   * /api/admin/users:
   *   post:
   *     summary: Create new user (Admin only)
   *     tags: [Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *               fullName: { type: string }
   *               role: { type: string, enum: [USER, ADMIN] }
   *     responses:
   *       201:
   *         description: User created
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
   * @swagger
   * /api/admin/users/{id}:
   *   put:
   *     summary: Update user (Admin only)
   *     tags: [Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullName: { type: string }
   *               role: { type: string, enum: [USER, ADMIN] }
   *               isActive: { type: boolean }
   *     responses:
   *       200:
   *         description: User updated
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
