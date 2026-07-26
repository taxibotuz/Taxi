import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { notificationSchemas } from '../validators';

const router = Router();
const controller = new NotificationController();

router.get('/', authenticate, controller.getNotifications.bind(controller));
router.put('/read-all', authenticate, controller.markAllAsRead.bind(controller));
router.put('/:notificationId/read', authenticate, validate(notificationSchemas.readOne), controller.markAsRead.bind(controller));
router.delete('/:notificationId', authenticate, validate(notificationSchemas.deleteOne), controller.deleteNotification.bind(controller));

export default router;
