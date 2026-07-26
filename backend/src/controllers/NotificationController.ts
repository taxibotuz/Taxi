import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Notification } from '../models/Notification';
import { logger } from '../config/logger';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, unreadOnly } = req.query;
      const query: any = { userId: req.user!._id };
      if (unreadOnly === 'true') query.isRead = false;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        userId: req.user!._id,
        isRead: false,
      });

      return res.json({ notifications, total, unreadCount, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { notificationId } = req.params;
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId: req.user!._id },
        { isRead: true, readAt: new Date() }
      );

      return res.json({ success: true });
    } catch (error) {
      logger.error('Mark as read error:', error);
      return res.status(500).json({ error: 'Failed to mark as read' });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      await Notification.updateMany(
        { userId: req.user!._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return res.json({ success: true });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      await Notification.findOneAndDelete({
        _id: req.params.notificationId,
        userId: req.user!._id,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Delete notification error:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
}
