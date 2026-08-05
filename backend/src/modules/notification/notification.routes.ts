/**
 * Notification Routes
 * System notification management for Admins
 */

import { Router } from 'express';
import notificationController from './notification.controller';
import { authenticate } from '@/modules/auth/auth.middleware';
import { requireRoles } from '@/common/middleware/rbac.middleware';
import { UserRole } from '@/common/constants/roles';
import { validate } from '@/common/middleware/validation.middleware';
import { notificationValidation } from './notification.validation';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/notifications
 * @desc    Admin creates a manual notification (broadcast to role or specific user)
 */
router.post('/', requireRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validate(notificationValidation.create), notificationController.createManualNotification);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get user notification preferences
 */
router.get('/preferences', notificationController.getPreferences);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update user notification preferences
 */
router.put('/preferences', notificationController.updatePreferences);
router.patch('/preferences', notificationController.updatePreferences);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications (paginated)
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/latest
 * @desc    Get latest 5 notifications
 */
router.get('/latest', notificationController.getLatest);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get holistic stats for Super Admin
 */
router.get('/stats', requireRoles(UserRole.SUPER_ADMIN), notificationController.getNotificationStats);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark specific notification as read
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Soft delete a notification
 */
router.delete('/:id', notificationController.deleteNotification);

export default router;
