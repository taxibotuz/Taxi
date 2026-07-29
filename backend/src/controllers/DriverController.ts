import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import { ActivityLog } from '../models/ActivityLog';
import { RideStatus, DriverStatus } from '../types';
import { logger } from '../config/logger';

export class DriverController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findOne({ userId: req.user!._id }).populate('userId', 'firstName lastName photoUrl');

      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [todayRides, weeklyRides, monthlyRides, activeRide, todayEarningsAgg, weeklyEarningsAgg, monthlyEarningsAgg] = await Promise.all([
        Order.countDocuments({ driverId: driver._id, createdAt: { $gte: todayStart } }),
        Order.countDocuments({ driverId: driver._id, createdAt: { $gte: weekStart } }),
        Order.countDocuments({ driverId: driver._id, createdAt: { $gte: monthStart } }),
        Order.findOne({ driverId: driver._id, status: { $in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] } }).populate('customerId', 'firstName lastName phone photoUrl'),
        Order.aggregate([
          { $match: { driverId: driver._id, status: RideStatus.COMPLETED, createdAt: { $gte: todayStart } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { driverId: driver._id, status: RideStatus.COMPLETED, createdAt: { $gte: weekStart } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { driverId: driver._id, status: RideStatus.COMPLETED, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
      ]);

      return res.json({
        driver,
        stats: {
          todayRides,
          weeklyRides,
          monthlyRides,
          todayEarnings: todayEarningsAgg[0]?.total || 0,
          weeklyEarnings: weeklyEarningsAgg[0]?.total || 0,
          monthlyEarnings: monthlyEarningsAgg[0]?.total || 0,
          totalRides: driver.totalRides,
          totalEarnings: driver.totalEarnings,
          rating: driver.rating,
        },
        activeRide,
      });
    } catch (error) {
      logger.error('Driver dashboard error:', error);
      return res.status(500).json({ error: 'Failed to get dashboard' });
    }
  }

  async toggleOnline(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findOne({ userId: req.user!._id });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      if (!driver.isApproved) {
        return res.status(403).json({ error: 'Driver not approved yet' });
      }

      driver.isOnline = !driver.isOnline;
      driver.status = driver.isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
      await driver.save();

      await ActivityLog.create({
        userId: req.user!._id,
        action: driver.isOnline ? 'go_online' : 'go_offline',
        entity: 'driver',
        entityId: driver._id.toString(),
        description: `Driver went ${driver.isOnline ? 'online' : 'offline'}`,
      });

      return res.json({ isOnline: driver.isOnline, status: driver.status });
    } catch (error) {
      logger.error('Toggle online error:', error);
      return res.status(500).json({ error: 'Failed to toggle status' });
    }
  }

  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { lat, lng } = req.body;
      const driver = await Driver.findOneAndUpdate(
        { userId: req.user!._id },
        {
          'currentLocation.coordinates': [lng, lat],
          'currentLocation.updatedAt': new Date(),
        },
        { new: true }
      );

      return res.json({ location: driver?.currentLocation });
    } catch (error) {
      logger.error('Update location error:', error);
      return res.status(500).json({ error: 'Failed to update location' });
    }
  }

  async getRideHistory(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findOne({ userId: req.user!._id });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const { page = 1, limit = 20 } = req.query;
      const cappedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const cappedPage = Math.max(Number(page) || 1, 1);
      const orders = await Order.find({ driverId: driver._id })
        .populate('customerId', 'firstName lastName photoUrl')
        .sort({ createdAt: -1 })
        .skip((cappedPage - 1) * cappedLimit)
        .limit(cappedLimit);

      const total = await Order.countDocuments({ driverId: driver._id });

      return res.json({ orders, total, page: cappedPage, pages: Math.ceil(total / cappedLimit) });
    } catch (error) {
      logger.error('Ride history error:', error);
      return res.status(500).json({ error: 'Failed to get history' });
    }
  }

  async getWallet(req: AuthRequest, res: Response) {
    try {
      const wallet = await Wallet.findOne({ userId: req.user!._id });
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const driver = await Driver.findOne({ userId: req.user!._id });
      const pendingEarnings = await Order.aggregate([
        { $match: { driverId: driver?._id, paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]);

      return res.json({
        wallet,
        pendingEarnings: pendingEarnings[0]?.total || 0,
        availableForWithdrawal: (wallet.balance + wallet.bonusBalance) * 0.8,
      });
    } catch (error) {
      logger.error('Get wallet error:', error);
      return res.status(500).json({ error: 'Failed to get wallet' });
    }
  }
}
