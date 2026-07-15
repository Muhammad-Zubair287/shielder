/**
 * Terms and Conditions Routes
 */

import { Router } from 'express';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { UserRole } from '@/common/constants/roles';
import TermsAndConditionsController from './terms-and-conditions.controller';
import { termsAndConditionsValidation } from './terms-and-conditions.validation';

const router = Router();

/**
 * @route   GET /api/terms-and-conditions
 * @desc    Get terms and conditions (Public)
 * @access  Public
 */
router.get('/', TermsAndConditionsController.getTermsAndConditions);

/**
 * @route   PUT /api/admin/terms-and-conditions
 * @desc    Update terms and conditions (Super Admin only)
 * @access  Private (Super Admin)
 */
router.put(
  '/admin',
  authenticate,
  requireRoles(UserRole.SUPER_ADMIN),
  validate(termsAndConditionsValidation.update),
  TermsAndConditionsController.updateTermsAndConditions
);

export default router;