/**
 * Notification Routes
 * System notification management for Admins
 */

import { Router } from 'express';
import notificationController from './notification.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { validate } from '@/common/middleware/validation.middleware';
import { notificationValidation } from './notification.validation';
import { UserRole } from '@/common/constants/roles';

const router = Router();

// All routes are protected and require Admin/Super Admin
router.use(authenticate);
router.use(requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN));

/**
 * GET /api/notifications
 */
router.get('/', validate(notificationValidation.queryParams, 'query'), notificationController.getNotifications);

/**
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * PATCH /api/notifications/read-all
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', validate(notificationValidation.idParam, 'params'), notificationController.markAsRead);

/**
 * DELETE /api/notifications/clear-read
 */
router.delete('/clear-read', notificationController.clearRead);

/**
 * DELETE /api/notifications/:id
 */
router.delete('/:id', validate(notificationValidation.idParam, 'params'), notificationController.deleteNotification);

export default router;
