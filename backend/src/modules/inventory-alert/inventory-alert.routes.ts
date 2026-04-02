/**
 * Inventory Alert Routes
 * Admin and Super Admin alert management endpoints
 */

import { Router } from 'express';
import { InventoryAlertController } from './inventory-alert.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { inventoryAlertValidation } from './inventory-alert.validation';

const router = Router();

/**
 * POST /api/admin/inventory-alerts
 * Create an inventory alert (Admin/Super Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(inventoryAlertValidation.createAlert),
  InventoryAlertController.createAlert
);

/**
 * GET /api/admin/inventory-alerts
 * List inventory alerts (Admin/Super Admin only)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(inventoryAlertValidation.listAlerts),
  InventoryAlertController.listAlerts
);

/**
 * PATCH /api/admin/inventory-alerts/:id
 * Update an inventory alert (Admin/Super Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(inventoryAlertValidation.updateAlert),
  InventoryAlertController.updateAlert
);

/**
 * DELETE /api/admin/inventory-alerts/:id
 * Delete an inventory alert (Admin/Super Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'SUPER_ADMIN'),
  InventoryAlertController.deleteAlert
);

/**
 * POST /api/admin/inventory-alerts/check
 * Manually trigger alert checks (Super Admin only)
 */
router.post(
  '/check',
  authenticate,
  authorize('SUPER_ADMIN'),
  InventoryAlertController.triggerAlertChecks
);

export default router;
