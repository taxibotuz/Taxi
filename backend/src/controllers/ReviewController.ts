import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Review } from '../models/Review';
import { Order } from '../models/Order';
import { Driver } from '../models/Driver';
import { User } from '../models/User';
import { RideStatus } from '../types';
import { logger } from '../config/logger';

export class ReviewController {
  async createReview(req: AuthRequest, res: Response) {
    try {
      const { orderId, rating, comment, type } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status !== RideStatus.COMPLETED) {
        return res.status(400).json({ error: 'Can only review completed orders' });
      }

      const existingReview = await Review.findOne({
        orderId,
        fromUserId: req.user!._id,
        type,
      });

      if (existingReview) {
        return res.status(400).json({ error: 'Already reviewed this order' });
      }

      const toUserId = type === 'customer_to_driver'
        ? (await Driver.findById(order.driverId))?.userId
        : order.customerId;

      const review = await Review.create({
        orderId,
        fromUserId: req.user!._id,
        toUserId,
        rating,
        comment,
        type,
      });

      const stats = await Review.aggregate([
        { $match: { toUserId, isApproved: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);

      if (stats.length > 0) {
        const newRating = Math.round(stats[0].avg * 10) / 10;
        if (type === 'customer_to_driver' && order.driverId) {
          await Driver.findByIdAndUpdate(order.driverId, { rating: newRating });
        } else {
          await User.findByIdAndUpdate(toUserId, { rating: newRating });
        }
      }

      return res.status(201).json({ review });
    } catch (error) {
      logger.error('Create review error:', error);
      return res.status(500).json({ error: 'Failed to create review' });
    }
  }

  async getReviews(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const reviews = await Review.find({ toUserId: userId, isApproved: true })
        .populate('fromUserId', 'firstName lastName photoUrl')
        .sort({ createdAt: -1 })
        .limit(20);

      const stats = await Review.aggregate([
        { $match: { toUserId: userId as any, isApproved: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);

      return res.json({
        reviews,
        stats: stats[0] || { avg: 0, count: 0 },
      });
    } catch (error) {
      logger.error('Get reviews error:', error);
      return res.status(500).json({ error: 'Failed to get reviews' });
    }
  }
}
