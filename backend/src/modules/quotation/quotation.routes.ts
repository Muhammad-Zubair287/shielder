/**
 * Quotation Routes
 */

import { Router } from 'express';
import { quotationController } from './quotation.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { quotationValidation } from './quotation.validation';
import { UserRole } from '@/common/constants/roles';

const router = Router();

// Apply authentication to all quotation routes
router.use(authenticate);

/**
 * GET /api/quotations/my
 * Customer-facing: Get authenticated user's quotations
 * Must be before /:id so it isn't swallowed as a parameterized route
 */
router.get('/my', quotationController.getMyQuotations.bind(quotationController));

// All remaining routes require admin or super admin role
router.use(requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

// Listing & analytics
router.get('/', quotationController.getAll);
router.get('/analytics', quotationController.getAnalytics);

// Cron / admin-triggered expiry job
router.post('/expire-stale', quotationController.expireStale);

// Single quotation CRUD
router.post('/', validate(quotationValidation.create), quotationController.create);
router.get('/:id', quotationController.getById);
router.put('/:id', validate(quotationValidation.update), quotationController.update);
router.delete('/:id', quotationController.delete);

// Lifecycle actions
router.post('/:id/send', quotationController.send);
router.post('/:id/approve', quotationController.approve);
router.post('/:id/reject', validate(quotationValidation.reject), quotationController.reject);
router.post('/:id/convert', quotationController.convertToOrder);
router.post('/:id/reactivate', validate(quotationValidation.reactivate), quotationController.reactivate);

export default router;
