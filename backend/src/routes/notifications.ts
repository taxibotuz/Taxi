import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.getNotifications.bind(controller));
router.put('/read-all', authenticate, controller.markAllAsRead.bind(controller));
router.put('/:notificationId/read', authenticate, controller.markAsRead.bind(controller));
router.delete('/:notificationId', authenticate, controller.deleteNotification.bind(controller));

export default router;
