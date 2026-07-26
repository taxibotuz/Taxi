import { Router } from 'express';
import { FoodController } from '../controllers/FoodController';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new FoodController();

router.get('/restaurants', controller.getRestaurants.bind(controller));
router.get('/restaurants/:id', controller.getRestaurantById.bind(controller));
router.get('/categories', controller.getCategories.bind(controller));
router.get('/restaurants/:restaurantId/categories/:categoryId/products', controller.getProductsByCategory.bind(controller));
router.post('/restaurants', authenticate, controller.createRestaurant.bind(controller));
router.post('/categories', authenticate, controller.createCategory.bind(controller));
router.post('/products', authenticate, controller.createProduct.bind(controller));

export default router;
