import { Router } from 'express';
import { DriverController } from '../controllers/DriverController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const controller = new DriverController();

router.get('/dashboard', authenticate, requireRole('driver', 'admin'), controller.getDashboard.bind(controller));
router.post('/toggle-online', authenticate, requireRole('driver'), controller.toggleOnline.bind(controller));
router.post('/location', authenticate, requireRole('driver'), controller.updateLocation.bind(controller));
router.get('/history', authenticate, requireRole('driver'), controller.getRideHistory.bind(controller));
router.get('/wallet', authenticate, requireRole('driver'), controller.getWallet.bind(controller));

export default router;
