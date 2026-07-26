import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new ReviewController();

router.post('/', authenticate, controller.createReview.bind(controller));
router.get('/:userId', controller.getReviews.bind(controller));

export default router;
