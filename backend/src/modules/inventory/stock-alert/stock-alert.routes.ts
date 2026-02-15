/**
 * Stock Alert Routes
 * Registers all stock-related endpoints
 */

import { Router } from 'express';
import stockAlertController from './stock-alert.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { stockAlertValidation } from './stock-alert.validation';
import { UserRole } from '@/common/constants/roles';

const router = Router();

// All routes are protected and require Admin or Super Admin
router.use(authenticate);
router.use(requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN));

/**
 * GET /api/products/low-stock
 * Retrieve products with stock <= threshold
 */
router.get('/low-stock', stockAlertController.getLowStockProducts);

/**
 * GET /api/products/low-stock/count
 * Retrieve count of low stock products
 */
router.get('/low-stock/count', stockAlertController.getLowStockCount);

/**
 * PATCH /api/products/:id/stock
 * Manually update product stock
 */
router.patch(
  '/:id/stock',
  validate(stockAlertValidation.updateStock),
  stockAlertController.updateStock
);

/**
 * PATCH /api/products/:id/threshold
 * Update product minimum stock threshold
 */
router.patch(
  '/:id/threshold',
  validate(stockAlertValidation.updateThreshold),
  stockAlertController.updateThreshold
);

export default router;
