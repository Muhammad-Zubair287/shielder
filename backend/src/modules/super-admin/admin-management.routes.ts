/**
 * Admin Management Routes (Dedicated for Super Admin)
 * Mounted at /api/admins
 */

import { Router } from 'express';
import { superAdminController } from './super-admin.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireSuperAdmin } from '../../common/middleware/rbac.middleware';
import { validate } from '../../common/middleware/validation.middleware';
import { superAdminValidation } from './super-admin.validation';

const router = Router();

// All routes require Super Admin authentication
router.use(authenticate, requireSuperAdmin);

/**
 * GET /api/admins/summary
 */
router.get('/summary', superAdminController.getAdminsSummary.bind(superAdminController));

/**
 * GET /api/admins
 */
router.get('/', validate(superAdminValidation.queryParams, 'query'), superAdminController.getAdmins.bind(superAdminController));

/**
 * POST /api/admins
 */
router.post('/', validate(superAdminValidation.createAdmin, 'body'), superAdminController.createUser.bind(superAdminController));

/**
 * PUT /api/admins/:id
 */
router.put('/:id', superAdminController.updateUser.bind(superAdminController));

/**
 * PATCH /api/admins/:id/status
 */
router.patch('/:id/status', validate(superAdminValidation.updateStatus, 'body'), superAdminController.updateUser.bind(superAdminController));

/**
 * DELETE /api/admins/:id
 */
router.delete('/:id', validate(superAdminValidation.deleteAdmin, 'body'), superAdminController.deleteUser.bind(superAdminController));

export default router;
