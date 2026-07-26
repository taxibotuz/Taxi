import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { walletSchemas } from '../validators';

const router = Router();
const controller = new WalletController();

router.get('/', authenticate, controller.getBalance.bind(controller));
router.get('/transactions', authenticate, controller.getTransactions.bind(controller));
router.post('/topup', authenticate, validate(walletSchemas.topUp), controller.topUp.bind(controller));

export default router;
