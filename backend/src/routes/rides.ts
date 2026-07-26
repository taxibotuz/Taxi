import { Router } from 'express';
import { RideController } from '../controllers/RideController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new RideController();

router.post('/', authenticate, controller.createOrder.bind(controller));
router.get('/', authenticate, controller.getOrders.bind(controller));
router.get('/estimate', authenticate, controller.estimatePrice.bind(controller));
router.get('/:id', authenticate, controller.getOrderById.bind(controller));
router.post('/:id/cancel', authenticate, controller.cancelOrder.bind(controller));
router.put('/:id/status', authenticate, controller.updateOrderStatus.bind(controller));

export default router;
