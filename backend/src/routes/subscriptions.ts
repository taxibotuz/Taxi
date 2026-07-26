import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const controller = new SubscriptionController();

router.get('/plans', authenticate, controller.getPlans.bind(controller));
router.get('/my', authenticate, requireRole('driver'), controller.getMySubscription.bind(controller));
router.post('/purchase', authenticate, requireRole('driver'), controller.purchaseSubscription.bind(controller));

router.get('/admin/plans', authenticate, requireRole('admin'), controller.getAllPlans.bind(controller));
router.post('/admin/plans', authenticate, requireRole('admin'), controller.createPlan.bind(controller));
router.put('/admin/plans/:planId', authenticate, requireRole('admin'), controller.updatePlan.bind(controller));
router.delete('/admin/plans/:planId', authenticate, requireRole('admin'), controller.deletePlan.bind(controller));
router.post('/admin/grant', authenticate, requireRole('admin'), controller.adminGrantSubscription.bind(controller));
router.get('/admin/active', authenticate, requireRole('admin'), controller.getActiveSubscriptions.bind(controller));
router.get('/admin/driver/:driverId', authenticate, requireRole('admin'), controller.getDriverSubscriptions.bind(controller));

export default router;
