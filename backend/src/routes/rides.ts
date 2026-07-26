import { Router } from 'express';
import { RideController } from '../controllers/RideController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rideSchemas } from '../validators';

const router = Router();
const controller = new RideController();

router.post('/', authenticate, validate(rideSchemas.create), controller.createOrder.bind(controller));
router.get('/', authenticate, controller.getOrders.bind(controller));
router.get('/estimate', authenticate, validate(rideSchemas.estimate), controller.estimatePrice.bind(controller));
router.get('/:id', authenticate, controller.getOrderById.bind(controller));
router.post('/:id/cancel', authenticate, validate(rideSchemas.cancel), controller.cancelOrder.bind(controller));
router.put('/:id/status', authenticate, validate(rideSchemas.updateStatus), controller.updateOrderStatus.bind(controller));

export default router;
