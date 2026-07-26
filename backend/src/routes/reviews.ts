import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { reviewSchemas } from '../validators';

const router = Router();
const controller = new ReviewController();

router.post('/', authenticate, validate(reviewSchemas.create), controller.createReview.bind(controller));
router.get('/:userId', controller.getReviews.bind(controller));

export default router;
