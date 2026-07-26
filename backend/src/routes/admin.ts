import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { adminSchemas } from '../validators';

const router = Router();
const controller = new AdminController();

router.get('/dashboard', authenticate, requireRole('admin'), controller.getDashboard.bind(controller));

router.get('/users', authenticate, requireRole('admin'), controller.getUsers.bind(controller));
router.get('/users/:userId', authenticate, requireRole('admin'), controller.getUserById.bind(controller));
router.delete('/users/:userId', authenticate, requireRole('admin'), controller.deleteUser.bind(controller));

router.get('/drivers', authenticate, requireRole('admin'), controller.getDrivers.bind(controller));
router.get('/drivers/:driverId', authenticate, requireRole('admin'), controller.getDriverById.bind(controller));
router.put('/drivers/:driverId', authenticate, requireRole('admin'), validate(adminSchemas.updateDriver), controller.updateDriver.bind(controller));
router.delete('/drivers/:driverId', authenticate, requireRole('admin'), controller.deleteDriver.bind(controller));
router.post('/drivers', authenticate, requireRole('admin'), validate(adminSchemas.addDriver), controller.createDriver.bind(controller));

router.get('/orders', authenticate, requireRole('admin'), controller.getOrders.bind(controller));
router.get('/orders/:orderId', authenticate, requireRole('admin'), controller.getOrderById.bind(controller));
router.post('/orders/:orderId/assign', authenticate, requireRole('admin'), controller.assignDriver.bind(controller));
router.post('/orders/:orderId/cancel', authenticate, requireRole('admin'), controller.cancelOrder.bind(controller));

router.get('/settings', authenticate, requireRole('admin'), controller.getSettings.bind(controller));
router.put('/settings', authenticate, requireRole('admin'), validate(adminSchemas.updateSettings), controller.updateSettings.bind(controller));

router.post('/assign-admin', authenticate, requireRole('admin'), validate(adminSchemas.assignAdmin), controller.assignAdmin.bind(controller));
router.post('/ban/:userId', authenticate, requireRole('admin'), controller.banUser.bind(controller));
router.post('/unban/:userId', authenticate, requireRole('admin'), controller.unbanUser.bind(controller));

router.get('/drivers-locations', authenticate, requireRole('admin'), controller.getDriversLocations.bind(controller));
router.get('/revenue', authenticate, requireRole('admin'), controller.getRevenueReport.bind(controller));
router.get('/reports', authenticate, requireRole('admin'), controller.getReports.bind(controller));
router.get('/logs', authenticate, requireRole('admin'), controller.getActivityLogs.bind(controller));

router.post('/notifications/broadcast', authenticate, requireRole('admin'), controller.sendBroadcast.bind(controller));

export default router;
