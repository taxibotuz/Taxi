import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new SearchController();

router.get('/autocomplete', controller.autocomplete.bind(controller));
router.get('/reverse', controller.reverseGeocode.bind(controller));

export default router;
