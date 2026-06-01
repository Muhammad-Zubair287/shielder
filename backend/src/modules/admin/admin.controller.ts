/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 */

import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sanitizeAuthUser } from '../../common/utils/helpers';
import {
  getPaginationParams,
  getSearchFilters,
} from '../../common/utils/pagination';
import { UserRole } from '../../common/constants/roles';
import { emailService } from '../../common/services/email.service';
import { logger } from '../../common/logger/logger';

export class AdminController {
  /**
   * GET /api/admin/users/stats
   * Get user stats for admin cards
   */
  async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const adminRole = req.user?.role as UserRole;
      const stats = await adminService.getUserStats(adminRole);

      res.json({
        success: true,
        message: 'User stats retrieved successfully',
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

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
        data: sanitizeAuthUser(user),
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
        data: sanitizeAuthUser(user),
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
        data: sanitizeAuthUser(user),
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

  /**
   * POST /api/admin/test-email
   * Send test email to verify email provider connectivity (Admin only)
   * Body: { to: "recipient@example.com" }
   */
  async testEmailConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { to } = req.body;
      const adminId = req.user?.id!;

      if (!to || typeof to !== 'string' || !to.includes('@')) {
        res.status(400).json({
          success: false,
          message: 'Invalid email address provided. Body should contain: { to: "user@example.com" }',
        });
        return;
      }

      logger.info(`Admin ${adminId} initiated test email send to ${to}`);

      const success = await emailService.sendEmail({
        to,
        subject: 'Shielder Email Provider Test',
        html: `<p>This is a test email from Shielder Platform.</p><p>If you received this, the email provider (Brevo) is working correctly.</p><p>Timestamp: ${new Date().toISOString()}</p>`,
        text: `Test email from Shielder Platform - ${new Date().toISOString()}`,
      });

      if (success) {
        logger.info(`Test email sent successfully to ${to}`);
        res.status(200).json({
          success: true,
          message: `Test email sent to ${to}. Please check your inbox and spam folder.`,
        });
      } else {
        logger.warn(`Test email send failed for ${to}`);
        res.status(502).json({
          success: false,
          message: `Failed to send test email to ${to}. Check server logs for email provider errors.`,
        });
      }
    } catch (error) {
      logger.error('Test email endpoint error', error);
      next(error);
    }
  }
}

export const adminController = new AdminController();
