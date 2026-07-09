/**
 * Application Routes
 * Mounted at /api/applications
 */

import { Router } from 'express';
import { applicationController } from './application.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { upload } from '@/common/middleware/upload.middleware';
import { applicationValidation } from './application.validation';

const router = Router();

/**
 * GET /api/applications/active
 * Public — no auth required
 */
router.get('/active', applicationController.getActiveApplications);

/**
 * GET /api/applications
 * SUPER_ADMIN only
 */
router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  applicationController.getApplications,
);

/**
 * GET /api/applications/:id
 * SUPER_ADMIN only
 */
router.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  applicationController.getApplicationById,
);

/**
 * POST /api/applications
 * SUPER_ADMIN only
 */
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN'),
  upload.single('appImage'),
  validate(applicationValidation.create),
  applicationController.createApplication,
);

/**
 * PUT /api/applications/:id
 * SUPER_ADMIN only
 */
router.put(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  upload.single('appImage'),
  validate(applicationValidation.update),
  applicationController.updateApplication,
);

/**
 * DELETE /api/applications/:id
 * SUPER_ADMIN only
 */
router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN'),
  applicationController.deleteApplication,
);

/**
 * PATCH /api/applications/:id/status
 * SUPER_ADMIN only
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(applicationValidation.updateStatus),
  applicationController.updateApplicationStatus,
);

export default router;
