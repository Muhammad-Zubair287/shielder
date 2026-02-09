/**
 * Super Admin Routes
 */

import { Router } from 'express';
import { superAdminController } from './super-admin.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireSuperAdmin } from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { superAdminValidation } from './super-admin.validation';

const router = Router();

// All routes require Super Admin
router.use(authenticate, requireSuperAdmin);

// Statistics
router.get('/statistics', superAdminController.getStatistics.bind(superAdminController));

// Get all users (all roles)
router.get('/users/all', validate(superAdminValidation.queryParams, 'query'), superAdminController.getAllUsers.bind(superAdminController));

// Get users only
router.get('/users', validate(superAdminValidation.queryParams, 'query'), superAdminController.getUsers.bind(superAdminController));

// Get admins only
router.get('/admins', validate(superAdminValidation.queryParams, 'query'), superAdminController.getAdmins.bind(superAdminController));

// Get single user
router.get('/users/:id', superAdminController.getUserById.bind(superAdminController));

// Create admin
router.post('/admins', validate(superAdminValidation.createAdmin), superAdminController.createAdmin.bind(superAdminController));

// Update user role
router.patch('/users/:id/role', validate(superAdminValidation.updateRole), superAdminController.updateUserRole.bind(superAdminController));

// Update status
router.patch('/users/:id/status', validate(superAdminValidation.updateStatus), superAdminController.updateUserStatus.bind(superAdminController));

// Delete user
router.delete('/users/:id', superAdminController.deleteUser.bind(superAdminController));

export default router;
