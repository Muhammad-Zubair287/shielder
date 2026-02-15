/**
 * Analytics Routes
 * Restricted to Super Admin for business intelligence
 */

import { Router } from 'express';
import analyticsController from './analytics.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { UserRole } from '@/common/constants/roles';

const router = Router();

// Global middleware for all analytics routes
router.use(authenticate);
router.use(requireRoles(UserRole.SUPER_ADMIN));

/**
 * GET /api/analytics/overview
 * Real-time summary of platform performance
 */
router.get('/overview', analyticsController.getOverview);

/**
 * GET /api/analytics/revenue/monthly
 * Revenue trends for the last 12 months
 */
router.get('/revenue/monthly', analyticsController.getRevenueMonthly);

/**
 * GET /api/analytics/orders/monthly
 * Order volume trends for the last 12 months
 */
router.get('/orders/monthly', analyticsController.getOrdersMonthly);

/**
 * GET /api/analytics/products/by-category
 * Inventory distribution by category
 */
router.get('/products/by-category', analyticsController.getProductsByCategory);

/**
 * GET /api/analytics/users/growth
 * New user acquisition trends
 */
router.get('/users/growth', analyticsController.getUserGrowth);

export default router;
