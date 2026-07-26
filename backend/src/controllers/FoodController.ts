import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Settings } from '../models/Settings';
import { logger } from '../config/logger';

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
      const restaurant = await Restaurant.create({
        ...req.body,
        ownerId: req.user!._id,
      });
      return res.status(201).json({ restaurant });
    } catch (error) {
      logger.error('Create restaurant error:', error);
      return res.status(500).json({ error: 'Failed to create restaurant' });
    }
  }

  async createProduct(req: AuthRequest, res: Response) {
    try {
      const product = await Product.create(req.body);
      return res.status(201).json({ product });
    } catch (error) {
      logger.error('Create product error:', error);
      return res.status(500).json({ error: 'Failed to create product' });
    }
  }

  async createCategory(req: AuthRequest, res: Response) {
    try {
      const category = await Category.create(req.body);
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
