/**
 * Product Review Routes
 * Review submission and management endpoints
 */

import { Router } from 'express';
import { ProductReviewController } from './product-review.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { productReviewValidation } from './product-review.validation';

const router = Router();

/**
 * POST /api/reviews
 * Add a new product review (customers only)
 */
router.post(
  '/',
  authenticate,
  validate(productReviewValidation.addReview),
  ProductReviewController.addReview
);

/**
 * GET /api/reviews
 * List product reviews (public)
 */
router.get(
  '/',
  validate(productReviewValidation.listReviews),
  ProductReviewController.listReviews
);

/**
 * PATCH /api/reviews/:id/approve
 * Approve or reject a review (Super Admin only)
 */
router.patch(
  '/:id/approve',
  authenticate,
  authorize('SUPER_ADMIN'),
  validate(productReviewValidation.approveReview),
  ProductReviewController.approveReview
);

export default router;
