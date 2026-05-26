/**
 * @openapi
 * responses:
 *   InternalError:
 *     $ref: '#/components/responses/InternalError'
 */

/**
 * Notification Controller
 * Handles HTTP requests for system notifications
 */

import { Response } from 'express';
import NotificationService from './notification.service';
import { asyncHandler } from '@/common/utils/helpers';
import { AuthRequest } from '@/types/global';

class NotificationController {
  /**
   * @swagger
   * /api/notifications:
   *   post:
   *     summary: Manually create and broadcast a notification (Admin/SuperAdmin)
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title, message]
   *             properties:
   *               title: { type: string }
   *               message: { type: string }
   *               targetRole: { type: string, enum: [USER, ADMIN, SUPER_ADMIN, STAFF] }
   *               targetUserId: { type: string }
   *     responses:
   *       201:
   *         description: Notification sent
   */
  createManualNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.user?.id;
    const adminName = req.user?.email ?? 'Admin';
    if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, message, targetRole, targetUserId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    await NotificationService.notify({
      type: 'SYSTEM_ALERT',
      title,
      message,
      module: 'MANUAL',
      roleTarget: targetRole || undefined,
      userId: targetUserId || undefined,
      triggeredById: adminId,
      triggeredBy: adminName,
      force: true,
      sendEmail: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Notification created and sent successfully',
    });
  });

  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Get paginated notifications for current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *       - in: query
   *         name: read
   *         schema: { type: boolean }
   *       - in: query
   *         name: global
   *         schema: { type: boolean }
   *         description: Super Admin only — view all notifications
   *     responses:
   *       200:
   *         description: Paginated notification list
   */
  getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const module = req.query.module as string;
    const search = req.query.search as string;
    const read = req.query.read === 'true' ? true : (req.query.read === 'false' ? false : undefined);
    
    // Super Admin can request global view
    const isGlobalRequest = req.query.global === 'true' && userRole === 'SUPER_ADMIN';

    const result = await NotificationService.getNotifications({
      userId: isGlobalRequest ? undefined : userId,
      page,
      limit,
      read,
      type,
      module,
      search,
      global: isGlobalRequest
    });

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      ...result,
    });
    return;
  });

  /**
   * @swagger
   * /api/notifications/stats:
   *   get:
   *     summary: Get holistic notification stats (Super Admin only)
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Notification statistics
   */
  getNotificationStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userRole = req.user?.role;
    if (userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const data = await NotificationService.getStats();

    return res.status(200).json({
      success: true,
      data
    });
  });

  /**
   * @swagger
   * /api/notifications/latest:
   *   get:
   *     summary: Get latest 5 notifications for current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 5 }
   *     responses:
   *       200:
   *         description: Latest notifications
   */
  getLatest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 5;
    const data = await NotificationService.getLatest(userId, limit);

    return res.status(200).json({
      success: true,
      data
    });
  });

  /**
   * @swagger
   * /api/notifications/unread-count:
   *   get:
   *     summary: Get count of unread notifications for current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Unread count
   */
  getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await NotificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: result,
    });
  });

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   patch:
   *     summary: Mark a specific notification as read
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Notification marked as read
   */
  markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = req.params.id as string;
    const notification = await NotificationService.markAsRead(userId, id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  });

  /**
   * @swagger
   * /api/notifications/read-all:
   *   patch:
   *     summary: Mark all notifications as read
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: All notifications marked as read
   */
  markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await NotificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  });

  /**
   * @swagger
   * /api/notifications/{id}:
   *   delete:
   *     summary: Soft delete a notification
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Notification deleted
   */
  deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const id = req.params.id as string;
    await NotificationService.deleteNotification(userId, id);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  });

  /**
   * @swagger
   * /api/notifications/preferences:
   *   get:
   *     summary: Get notification preferences for current user
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200:
   *         description: Notification preferences
   *   put:
   *     summary: Update notification preferences
   *     tags: [Notifications]
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200:
   *         description: Preferences updated
   */
  getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await NotificationService.getPreferences(userId);
    return res.json({ success: true, data });
  });

  updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const data = await NotificationService.updatePreferences(userId, req.body);
    return res.json({ success: true, data });
  });
}

export default new NotificationController();
