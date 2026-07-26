import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new AuthController();

router.post('/telegram', controller.telegramLogin.bind(controller));
router.get('/profile', authenticate, controller.getProfile.bind(controller));
router.put('/profile', authenticate, controller.updateProfile.bind(controller));
router.post('/become-driver', authenticate, controller.becomeDriver.bind(controller));
router.get('/verify', authenticate, controller.verifyToken.bind(controller));

export default router;
