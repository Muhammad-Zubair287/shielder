/**
 * Admin Routes
 * Routes for admin user management
 */

import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate } from '../auth/auth.middleware';
import {
  requireAdmin,
  restrictAdminToUsers,
} from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { adminValidation } from './admin.validation';
import adminContactRoutes from './contact/admin-contact.routes';
import adminNewsletterRoutes from '@/modules/newsletter/admin-newsletter.routes';
import warehouseRoutes from '@/modules/warehouse/warehouse.routes';
import { inventoryController } from '@/modules/inventory/inventory.controller';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/users
 * Get all users with search, filter, and pagination
 * Query params: page, limit, search, status, isActive, dateFrom, dateTo
 */
router.get('/users/stats', adminController.getUserStats.bind(adminController));

router.get(
  '/users',
  validate(adminValidation.queryParams),
  adminController.getUsers.bind(adminController)
);

/**
 * GET /api/admin/users/:id
 * Get single user by ID
 */
router.get('/users/:id', adminController.getUserById.bind(adminController));

/**
 * POST /api/admin/users
 * Create new user (USER role only for ADMIN)
 */
router.post(
  '/users',
  restrictAdminToUsers,
  validate(adminValidation.createUser),
  adminController.createUser.bind(adminController)
);

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put(
  '/users/:id',
  restrictAdminToUsers,
  validate(adminValidation.updateUser),
  adminController.updateUser.bind(adminController)
);

/**
 * PATCH /api/admin/users/:id/status
 * Update user status (activate/deactivate)
 */
router.patch(
  '/users/:id/status',
  validate(adminValidation.updateStatus),
  adminController.updateUserStatus.bind(adminController)
);

/**
 * PATCH /api/admin/users/:id/reset-password
 * Reset user password
 */
router.patch(
  '/users/:id/reset-password',
  validate(adminValidation.resetPassword),
  adminController.resetUserPassword.bind(adminController)
);

/**
 * DELETE /api/admin/users/:id
 * Soft delete user
 */
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

/**
 * POST /api/admin/test-email
 * Send a test email to verify email provider (Brevo) connectivity
 * Body: { to: "recipient@example.com" }
 */
router.post('/test-email', adminController.testEmailConnection.bind(adminController));

/**
 * /api/admin/contacts
 * Admin/Super Admin contact management
 */
router.use('/contacts', adminContactRoutes);

/**
 * /api/admin/newsletter
 * Admin/Super Admin newsletter subscriber management
 */
router.use('/newsletter', adminNewsletterRoutes);

/**
 * /api/admin/warehouses
 * Admin/Super Admin warehouse management
 */
router.use('/warehouses', warehouseRoutes);

/**
 * /api/admin/inventory
 * Admin/Super Admin warehouse-based inventory management
 */
router.post('/inventory', inventoryController.upsertStock);
router.get('/inventory', inventoryController.getInventory);

export default router;
