/**
 * Super Admin Controller
 */

import { Request, Response, NextFunction } from 'express';
import { superAdminService } from './super-admin.service';
import { getPaginationParams, getSearchFilters } from '../../common/utils/pagination';

export class SuperAdminController {
  /**
   * @swagger
   * /api/super-admin/users/all:
   *   get:
   *     summary: Get all system users (Super Admin only)
   *     tags: [Super Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of all users
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getAllUsers(filters, pagination);

      res.json({ success: true, message: 'All users retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users:
   *   get:
   *     summary: Get users with role USER
   *     tags: [Super Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of users
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getUsers(filters, pagination);

      res.json({ success: true, message: 'Users retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/admins:
   *   get:
   *     summary: Get all admins (Super Admin only)
   *     tags: [Super Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: List of admins
   */
  async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = getSearchFilters(req);

      const result = await superAdminService.getAdmins(filters, pagination);

      res.json({ success: true, message: 'Admins retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/{id}:
   *   get:
   *     summary: Get user by ID (Super Admin only)
   *     tags: [Super Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: User details
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await superAdminService.getUserById(String(req.params.id));
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/admins:
   *   post:
   *     summary: Create a new Admin
   *     tags: [Super Admin Panel]
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
   *     responses:
   *       201:
   *         description: Admin created
   */
  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.id!;
      const admin = await superAdminService.createAdmin(req.body, createdBy);

      res.status(201).json({ success: true, message: 'Admin created', data: admin });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/{id}/role:
   *   patch:
   *     summary: Update user role (Super Admin only)
   *     tags: [Super Admin Panel]
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
   *             required: [role]
   *             properties:
   *               role: { type: string, enum: [USER, ADMIN, SUPER_ADMIN] }
   *     responses:
   *       200:
   *         description: Role updated
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user?.id!;
      const user = await superAdminService.updateUserRole(
        String(req.params.id),
        req.body.role,
        updatedBy
      );

      res.json({ success: true, message: 'Role updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/{id}/status:
   *   patch:
   *     summary: Update user active status (Super Admin only)
   *     tags: [Super Admin Panel]
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
   *             required: [isActive]
   *             properties:
   *               isActive: { type: boolean }
   *     responses:
   *       200:
   *         description: Status updated
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user?.id!;
      const user = await superAdminService.updateUserStatus(
        String(req.params.id),
        req.body.isActive,
        updatedBy
      );

      res.json({ success: true, message: 'Status updated', data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/{id}:
   *   delete:
   *     summary: Delete user (Super Admin only)
   *     tags: [Super Admin Panel]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: User deleted
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedBy = req.user?.id!;
      const result = await superAdminService.deleteUser(String(req.params.id), deletedBy);

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();
