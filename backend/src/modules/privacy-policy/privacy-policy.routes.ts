/**
 * Privacy Policy Routes
 */

import { Router } from 'express';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { UserRole } from '@/common/constants/roles';
import PrivacyPolicyController from './privacy-policy.controller';
import { privacyPolicyValidation } from './privacy-policy.validation';

const router = Router();

/**
 * @route   GET /api/privacy-policy
 * @desc    Get current privacy policy (Public)
 * @access  Public
 */
router.get('/', PrivacyPolicyController.getPolicy);

/**
 * @route   PUT /api/admin/privacy-policy
 * @desc    Update privacy policy
 * @access  Private (Super Admin)
 */
router.put(
  '/admin',
  authenticate,
  requireRoles(UserRole.SUPER_ADMIN),
  validate(privacyPolicyValidation.update),
  PrivacyPolicyController.updatePolicy
);

export default router;
