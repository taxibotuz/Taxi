import { Router } from 'express';
import { PromoCodeController } from '../controllers/PromoCodeController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { promocodeSchemas } from '../validators';

const router = Router();
const controller = new PromoCodeController();

router.get('/validate/:code', authenticate, controller.validatePromo.bind(controller));
router.post('/', authenticate, requireRole('admin'), validate(promocodeSchemas.create), controller.createPromo.bind(controller));
router.get('/', authenticate, requireRole('admin'), controller.getPromos.bind(controller));

export default router;
