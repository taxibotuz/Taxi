import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Settings } from '../models/Settings';
import { logger } from '../config/logger';

const ALLOWED_RESTAURANT_FIELDS = [
  'name', 'description', 'logo', 'coverImage', 'location', 'phone',
  'categories', 'workingHours', 'deliveryFee', 'minOrderAmount',
  'estimatedDeliveryTime', 'cuisine', 'isOpen',
];

const ALLOWED_PRODUCT_FIELDS = [
  'name', 'description', 'price', 'discountPrice', 'images',
  'categoryId', 'restaurantId', 'isAvailable', 'isFeatured',
  'preparationTime', 'ingredients', 'nutritionalInfo', 'sortOrder',
];

const ALLOWED_CATEGORY_FIELDS = [
  'name', 'description', 'image', 'restaurantId', 'isActive', 'sortOrder',
];

export class FoodController {
  async getRestaurants(req: AuthRequest, res: Response) {
    try {
      const settings = await Settings.findOne();
      if (!settings?.features.foodDelivery) {
        return res.status(404).json({ error: 'Food delivery not available' });
      }

      const { lat, lng, radius = 10 } = req.query;
      const query: any = { isActive: true, isApproved: true, isOpen: true };

      if (lat && lng) {
        query['location'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [+lng as number, +lat as number] },
            $maxDistance: +radius * 1000,
          },
        };
      }

      const restaurants = await Restaurant.find(query)
        .populate('categories')
        .sort({ rating: -1 });

      return res.json({ restaurants });
    } catch (error) {
      logger.error('Get restaurants error:', error);
      return res.status(500).json({ error: 'Failed to get restaurants' });
    }
  }

  async getRestaurantById(req: AuthRequest, res: Response) {
    try {
      const restaurant = await Restaurant.findById(req.params.id)
        .populate('categories');

      if (!restaurant) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }

      const products = await Product.find({ restaurantId: restaurant._id, isAvailable: true })
        .populate('categoryId')
        .sort({ sortOrder: 1 });

      return res.json({ restaurant, products });
    } catch (error) {
      logger.error('Get restaurant error:', error);
      return res.status(500).json({ error: 'Failed to get restaurant' });
    }
  }

  async getProductsByCategory(req: AuthRequest, res: Response) {
    try {
      const { restaurantId, categoryId } = req.params;
      const products = await Product.find({
        restaurantId,
        categoryId,
        isAvailable: true,
      }).sort({ sortOrder: 1 });

      return res.json({ products });
    } catch (error) {
      logger.error('Get products error:', error);
      return res.status(500).json({ error: 'Failed to get products' });
    }
  }

  async createRestaurant(req: AuthRequest, res: Response) {
    try {
      const data: Record<string, any> = { ownerId: req.user!._id };
      for (const key of ALLOWED_RESTAURANT_FIELDS) {
        if (key in req.body) data[key] = req.body[key];
      }
      const restaurant = await Restaurant.create(data);
      return res.status(201).json({ restaurant });
    } catch (error) {
      logger.error('Create restaurant error:', error);
      return res.status(500).json({ error: 'Failed to create restaurant' });
    }
  }

  async createProduct(req: AuthRequest, res: Response) {
    try {
      const data: Record<string, any> = {};
      for (const key of ALLOWED_PRODUCT_FIELDS) {
        if (key in req.body) data[key] = req.body[key];
      }
      const product = await Product.create(data);
      return res.status(201).json({ product });
    } catch (error) {
      logger.error('Create product error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  async createCategory(req: AuthRequest, res: Response) {
    try {
      const data: Record<string, any> = {};
      for (const key of ALLOWED_CATEGORY_FIELDS) {
        if (key in req.body) data[key] = req.body[key];
      }
      const category = await Category.create(data);
      return res.status(201).json({ category });
    } catch (error) {
      logger.error('Create category error:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }
  }

  async getCategories(req: AuthRequest, res: Response) {
    try {
      const { restaurantId } = req.query;
      const query: any = {};
      if (restaurantId) query.restaurantId = restaurantId;

      const categories = await Category.find(query).sort({ sortOrder: 1 });
      return res.json({ categories });
    } catch (error) {
      logger.error('Get categories error:', error);
      return res.status(500).json({ error: 'Failed to get categories' });
    }
  }
}
