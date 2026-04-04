/**
 * Super Admin Controller
 */

import { Request, Response, NextFunction } from 'express';
import { superAdminService } from './super-admin.service';
import { getPaginationParams } from '../../common/utils/pagination';

export class SuperAdminController {
  /**
   * @swagger
   * /api/super-admin/users/stats:
   *   get:
   *     summary: Get user management statistics (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: User stats (total, active, inactive, new)
   */
  async getUserStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getUserStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/all:
   *   get:
   *     summary: Get all users with full filters and pagination (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: role
   *         schema: { type: string, enum: [USER, ADMIN, SUPER_ADMIN, STAFF] }
   *       - in: query
   *         name: status
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Paginated user list
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = {
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };

      const result = await superAdminService.getAllUsers(filters, pagination);
      res.json({ success: true, message: 'Users retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy Support: Get admins only
   */
  async getAdmins(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = getPaginationParams(req);
      const filters = {
        search: req.query.search,
        role: req.query.role,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        // Keep admins endpoint scoped to admin-tier roles unless an explicit role is requested.
        roles: req.query.role ? undefined : ['ADMIN', 'SUPER_ADMIN'],
      };
      const result = await superAdminService.getAllUsers(filters, pagination);
      res.json({ success: true, message: 'Admins retrieved', ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Legacy Support: Get Admin Summary
   */
  async getAdminsSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await superAdminService.getAdminSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/create:
   *   post:
   *     summary: Create a new user of any role (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, role]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               fullName: { type: string }
   *               role: { type: string, enum: [USER, ADMIN, STAFF] }
   *     responses:
   *       201:
   *         description: User created
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user?.id!;
      const user = await superAdminService.createUser(req.body, createdBy);

      res.status(201).json({ 
        success: true, 
        message: 'User account created successfully.', 
        data: user 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/users/{id}:
   *   put:
   *     summary: Update user details, role, or status (Super Admin)
   *     tags: [Super Admin]
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
   *     responses:
   *       200:
   *         description: User updated
   *   delete:
   *     summary: Soft delete a user (Super Admin)
   *     tags: [Super Admin]
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
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user?.id!;
      const user = await superAdminService.updateUser(
        String(req.params.id),
        req.body,
        updatedBy
      );

      res.json({ 
        success: true, 
        message: 'User account updated successfully.', 
        data: user 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete User (Soft Delete)
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedBy = req.user?.id!;
      const result = await superAdminService.deleteUser(
        String(req.params.id),
        deletedBy
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/statistics:
   *   get:
   *     summary: Get overall platform statistics (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Platform-wide statistics
   */
  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getStatistics();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/dashboard/summary:
   *   get:
   *     summary: Get dashboard summary counts and revenue (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Dashboard summary data
   */
  async getDashboardSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await superAdminService.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/analytics/monthly:
   *   get:
   *     summary: Get monthly analytics data for charts (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Monthly analytics
   */
  async getMonthlyAnalytics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await superAdminService.getMonthlyAnalytics();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/super-admin/activity:
   *   get:
   *     summary: Get recent system-wide audit log / activity feed (Super Admin)
   *     tags: [Super Admin]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Recent activity entries
   */
  async getRecentActivity(_req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await superAdminService.getRecentActivity();
      res.json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  }
}

export const superAdminController = new SuperAdminController();

