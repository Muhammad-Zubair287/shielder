import { Router } from 'express';
import { orderController } from './order.controller';
import { authenticate } from '../auth/auth.middleware';
import { requireAdmin } from '../../common/middleware/rbac.middleware';
import { validate, validateQuery } from '../../common/middleware/validation.middleware';
import { orderValidation } from './order.validation';

const router = Router();

// Apply authentication to all order routes
router.use(authenticate);

/**
 * GET /api/orders/my
 * Customer's own order history — must be before /:id so it isn't swallowed
 */
router.get('/my', orderController.getMyOrders.bind(orderController));

/**
 * GET /api/orders/summary
 * Get order totals for dashboard summary cards
 */
router.get('/summary', requireAdmin, orderController.getSummary);

/**
 * GET /api/orders
 * List orders with filters
 */
router.get(
  '/',
  requireAdmin,
  validateQuery(orderValidation.queryParams),
  orderController.getOrders
);

/**
 * GET /api/orders/:id
 * Get single order details
 */
router.get('/:id', orderController.getOrderById);

/**
 * POST /api/orders
 * Create a new order (can be used by Admin for manual orders or system-wide)
 */
router.post(
  '/',
  validate(orderValidation.createOrder),
  orderController.createOrder
);

/**
 * PATCH /api/orders/:id/status
 * Update order or payment status
 */
router.patch(
  '/:id/status',
  requireAdmin,
  validate(orderValidation.updateStatus),
  orderController.updateStatus
);

export default router;
