import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authSchemas } from '../validators';

const router = Router();
const controller = new AuthController();

router.post('/telegram', validate(authSchemas.telegram), controller.telegramLogin.bind(controller));
router.get('/profile', authenticate, controller.getProfile.bind(controller));
router.put('/profile', authenticate, validate(authSchemas.profileUpdate), controller.updateProfile.bind(controller));
router.post('/become-driver', authenticate, validate(authSchemas.becomeDriver), controller.becomeDriver.bind(controller));
router.get('/verify', authenticate, controller.verifyToken.bind(controller));

export default router;
