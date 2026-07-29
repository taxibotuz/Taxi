import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Driver } from '../models/Driver';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { ActivityLog } from '../models/ActivityLog';
import { logger } from '../config/logger';

export class SubscriptionController {
  async getPlans(req: AuthRequest, res: Response) {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true })
        .sort({ sortOrder: 1, price: 1 })
        .lean();
      return res.json({ plans });
    } catch (error) {
      logger.error('Get subscription plans error:', error);
      return res.status(500).json({ error: 'Failed to get plans' });
    }
  }

  async getAllPlans(req: AuthRequest, res: Response) {
    try {
      const plans = await SubscriptionPlan.find()
        .sort({ sortOrder: 1, price: 1 })
        .lean();
      return res.json({ plans });
    } catch (error) {
      logger.error('Get all subscription plans error:', error);
      return res.status(500).json({ error: 'Failed to get plans' });
    }
  }

  async createPlan(req: AuthRequest, res: Response) {
    try {
      const { name, description, durationDays, price, features, maxRidesPerDay, maxRadius, commissionDiscount, sortOrder } = req.body;

      const plan = await SubscriptionPlan.create({
        name,
        description,
        durationDays,
        price,
        features,
        maxRidesPerDay: maxRidesPerDay || 0,
        maxRadius: maxRadius || 0,
        commissionDiscount: commissionDiscount || 0,
        sortOrder: sortOrder || 0,
      });

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'create_subscription_plan',
        entity: 'subscription_plan',
        entityId: plan._id.toString(),
        description: `Admin created subscription plan: ${name}`,
      });

      return res.status(201).json({ plan });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        const field = Object.keys(error.errors)[0];
        return res.status(400).json({
          success: false,
          field,
          message: error.errors[field]?.message || 'Validation failed',
        });
      }
      logger.error('Create subscription plan error:', error);
      return res.status(500).json({ error: 'Failed to create plan' });
    }
  }

  async updatePlan(req: AuthRequest, res: Response) {
    try {
      const { planId } = req.params;
      const allowedUpdates = ['name', 'description', 'durationDays', 'price', 'features', 'maxRidesPerDay', 'maxRadius', 'commissionDiscount', 'isActive', 'sortOrder'];
      const updates: Record<string, any> = {};
      for (const key of allowedUpdates) {
        if (key in req.body) updates[key] = req.body[key];
      }

      const plan = await SubscriptionPlan.findByIdAndUpdate(planId, updates, { new: true });
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      return res.json({ plan });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        const field = Object.keys(error.errors)[0];
        return res.status(400).json({
          success: false,
          field,
          message: error.errors[field]?.message || 'Validation failed',
        });
      }
      logger.error('Update subscription plan error:', error);
      return res.status(500).json({ error: 'Failed to update plan' });
    }
  }

  async deletePlan(req: AuthRequest, res: Response) {
    try {
      const { planId } = req.params;
      const plan = await SubscriptionPlan.findByIdAndDelete(planId);
      if (!plan) return res.status(404).json({ error: 'Plan not found' });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Delete subscription plan error:', error);
      return res.status(500).json({ error: 'Failed to delete plan' });
    }
  }

  async getMySubscription(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findOne({ userId: req.user!._id });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const subscription = await Subscription.findOne({ driverId: driver._id })
        .sort({ createdAt: -1 })
        .populate('planId', 'name description durationDays price features')
        .lean();

      return res.json({ subscription });
    } catch (error) {
      logger.error('Get my subscription error:', error);
      return res.status(500).json({ error: 'Failed to get subscription' });
    }
  }

  async purchaseSubscription(req: AuthRequest, res: Response) {
    try {
      const { planId, paymentMethod } = req.body;

      const driver = await Driver.findOne({ userId: req.user!._id });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return res.status(404).json({ error: 'Plan not found or inactive' });
      }

      const now = new Date();
      const currentSub = await Subscription.findOne({
        driverId: driver._id,
        status: 'active',
      }).sort({ expiresAt: -1 });

      let startsAt = now;
      if (currentSub && currentSub.expiresAt > now) {
        startsAt = currentSub.expiresAt;
      }

      const expiresAt = new Date(startsAt);
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      const subscription = await Subscription.create({
        driverId: driver._id,
        planId: plan._id,
        status: 'active',
        startsAt,
        expiresAt,
        paymentMethod,
        paymentAmount: plan.price,
        paymentStatus: 'paid',
      });

      driver.subscription = {
        active: true,
        planId: plan._id,
        expiresAt,
      };
      await driver.save();

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'purchase_subscription',
        entity: 'subscription',
        entityId: subscription._id.toString(),
        description: `Driver purchased plan: ${plan.name}`,
      });

      const populated = await Subscription.findById(subscription._id)
        .populate('planId', 'name description durationDays price features');

      return res.status(201).json({ subscription: populated });
    } catch (error) {
      logger.error('Purchase subscription error:', error);
      return res.status(500).json({ error: 'Failed to purchase subscription' });
    }
  }

  async adminGrantSubscription(req: AuthRequest, res: Response) {
    try {
      const { driverId, planId, durationDays, paymentAmount } = req.body;

      if (!driverId) {
        return res.status(400).json({ success: false, message: 'Invalid driver identifier' });
      }

      const driver = await this.resolveDriverByIdentifier(driverId);
      if (!driver) {
        return res.status(400).json({ success: false, message: 'Invalid driver identifier' });
      }

      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      const now = new Date();
      const currentSub = await Subscription.findOne({
        driverId: driver._id,
        status: 'active',
      }).sort({ expiresAt: -1 });

      let startsAt = now;
      if (currentSub && currentSub.expiresAt > now) {
        startsAt = currentSub.expiresAt;
      }

      const days = durationDays || plan.durationDays;
      const expiresAt = new Date(startsAt);
      expiresAt.setDate(expiresAt.getDate() + days);

      const subscription = await Subscription.create({
        driverId: driver._id,
        planId: plan._id,
        status: 'active',
        startsAt,
        expiresAt,
        paymentAmount: paymentAmount || 0,
        paymentStatus: paymentAmount ? 'paid' : 'paid',
      });

      driver.subscription = {
        active: true,
        planId: plan._id,
        expiresAt,
      };
      await driver.save();

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'grant_subscription',
        entity: 'subscription',
        entityId: subscription._id.toString(),
        description: `Admin granted subscription to driver ${driver._id}`,
      });

      return res.status(201).json({ subscription });
    } catch (error) {
      logger.error('Admin grant subscription error:', error);
      return res.status(500).json({ error: 'Failed to grant subscription' });
    }
  }

  private async resolveDriverByIdentifier(driverId: string) {
    if (mongoose.Types.ObjectId.isValid(driverId)) {
      return await Driver.findById(driverId);
    }
    const user = await User.findOne({ telegramId: Number(driverId) });
    if (!user) return null;
    return await Driver.findOne({ userId: user._id });
  }

  async getDriverSubscriptions(req: AuthRequest, res: Response) {
    try {
      const { driverId } = req.params;

      if (!driverId) {
        return res.status(400).json({ success: false, message: 'Invalid driver identifier' });
      }

      const driver = await this.resolveDriverByIdentifier(driverId);
      if (!driver) {
        return res.status(400).json({ success: false, message: 'Invalid driver identifier' });
      }

      const subscriptions = await Subscription.find({ driverId: driver._id })
        .sort({ createdAt: -1 })
        .populate('planId', 'name description durationDays price')
        .lean();
      return res.json({ subscriptions });
    } catch (error) {
      logger.error('Get driver subscriptions error:', error);
      return res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  }

  async getActiveSubscriptions(req: AuthRequest, res: Response) {
    try {
      const now = new Date();
      const { page = 1, limit = 50 } = req.query;
      const cappedLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
      const cappedPage = Math.max(Number(page) || 1, 1);

      const subscriptions = await Subscription.find({ status: 'active', expiresAt: { $gt: now } })
        .sort({ expiresAt: 1 })
        .skip((cappedPage - 1) * cappedLimit)
        .limit(cappedLimit)
        .populate('driverId', 'userId car')
        .populate({
          path: 'driverId',
          populate: { path: 'userId', select: 'firstName lastName phone' },
        })
        .populate('planId', 'name price durationDays')
        .lean();

      const total = await Subscription.countDocuments({ status: 'active', expiresAt: { $gt: now } });

      return res.json({ subscriptions, total, page: cappedPage, pages: Math.ceil(total / cappedLimit) });
    } catch (error) {
      logger.error('Get active subscriptions error:', error);
      return res.status(500).json({ error: 'Failed to get active subscriptions' });
    }
  }

  async checkAndExpireSubscriptions() {
    try {
      const now = new Date();
      const expired = await Subscription.find({
        status: 'active',
        expiresAt: { $lte: now },
      });

      for (const sub of expired) {
        sub.status = 'expired';
        await sub.save();

        await Driver.findByIdAndUpdate(sub.driverId, {
          'subscription.active': false,
        });
      }

      if (expired.length > 0) {
        logger.info(`Expired ${expired.length} subscriptions`);
      }

      return expired.length;
    } catch (error) {
      logger.error('Check and expire subscriptions error:', error);
      return 0;
    }
  }

  async getExpiringSubscriptions(days: number = 7) {
    try {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);

      const expiring = await Subscription.find({
        status: 'active',
        expiresAt: { $gt: now, $lte: futureDate },
        reminderSent: false,
      })
        .populate('driverId')
        .populate('planId', 'name')
        .lean();

      return expiring;
    } catch (error) {
      logger.error('Get expiring subscriptions error:', error);
      return [];
    }
  }

  async markReminderSent(subscriptionId: string) {
    try {
      await Subscription.findByIdAndUpdate(subscriptionId, { reminderSent: true });
    } catch (error) {
      logger.error('Mark reminder sent error:', error);
    }
  }
}
