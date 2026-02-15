/**
 * Notification Controller
 * Handles HTTP requests for system notifications
 */

import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { asyncHandler } from '@/common/utils/helpers';

class NotificationController {
  /**
   * GET /api/notifications
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await NotificationService.getNotifications(page, limit);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      ...result,
    });
  });

  /**
   * GET /api/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (_req: Request, res: Response) => {
    const result = await NotificationService.getUnreadCount();

    res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: result,
    });
  });

  /**
   * PATCH /api/notifications/:id/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const notification = await NotificationService.markAsRead(id);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  });

  /**
   * PATCH /api/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (_req: Request, res: Response) => {
    await NotificationService.markAllAsRead();

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  });

  /**
   * DELETE /api/notifications/:id
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await NotificationService.deleteNotification(id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  });

  /**
   * DELETE /api/notifications/clear-read
   */
  clearRead = asyncHandler(async (_req: Request, res: Response) => {
    await NotificationService.clearRead();

    res.status(200).json({
      success: true,
      message: 'All read notifications cleared',
    });
  });
}

export default new NotificationController();
