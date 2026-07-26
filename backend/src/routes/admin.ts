import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const controller = new AdminController();

router.get('/dashboard', authenticate, requireRole('admin'), controller.getDashboard.bind(controller));
router.get('/users', authenticate, requireRole('admin'), controller.getUsers.bind(controller));
router.get('/drivers', authenticate, requireRole('admin'), controller.getDrivers.bind(controller));
router.put('/drivers/:driverId', authenticate, requireRole('admin'), controller.updateDriver.bind(controller));
router.get('/orders', authenticate, requireRole('admin'), controller.getOrders.bind(controller));
router.get('/settings', authenticate, requireRole('admin'), controller.getSettings.bind(controller));
router.put('/settings', authenticate, requireRole('admin'), controller.updateSettings.bind(controller));
router.post('/assign-admin', authenticate, requireRole('admin'), controller.assignAdmin.bind(controller));
router.post('/ban/:userId', authenticate, requireRole('admin'), controller.banUser.bind(controller));
router.post('/unban/:userId', authenticate, requireRole('admin'), controller.unbanUser.bind(controller));
router.get('/drivers-locations', authenticate, requireRole('admin'), controller.getDriversLocations.bind(controller));
router.get('/revenue', authenticate, requireRole('admin'), controller.getRevenueReport.bind(controller));
router.get('/logs', authenticate, requireRole('admin'), controller.getActivityLogs.bind(controller));

export default router;
