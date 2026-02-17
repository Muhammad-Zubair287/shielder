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
   * GET /api/notifications
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
   * GET /api/notifications/stats
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
   * GET /api/notifications/latest
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
   * GET /api/notifications/unread-count
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
   * PATCH /api/notifications/:id/read
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
   * PATCH /api/notifications/read-all
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
   * DELETE /api/notifications/:id
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
   * Preferences
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
