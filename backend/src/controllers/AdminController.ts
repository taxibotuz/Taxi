import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { Settings } from '../models/Settings';
import { Wallet } from '../models/Wallet';
import { ActivityLog } from '../models/ActivityLog';
import { UserRole, RideStatus } from '../types';
import { logger } from '../config/logger';

export class AdminController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalUsers,
        totalDrivers,
        totalAdmins,
        onlineDrivers,
        pendingOrders,
        activeOrders,
        completedToday,
        revenueToday,
        totalRevenue,
        recentOrders,
        recentLogs,
      ] = await Promise.all([
        User.countDocuments({ role: UserRole.CUSTOMER }),
        User.countDocuments({ role: UserRole.DRIVER }),
        User.countDocuments({ role: UserRole.ADMIN }),
        Driver.countDocuments({ isOnline: true, status: 'online' }),
        Order.countDocuments({ status: RideStatus.PENDING }),
        Order.countDocuments({ status: { $in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] } }),
        Order.countDocuments({ status: RideStatus.COMPLETED, createdAt: { $gte: today } }),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.find().sort({ createdAt: -1 }).limit(10).populate('customerId', 'firstName lastName'),
        ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName'),
      ]);

      return res.json({
        stats: {
          totalUsers,
          totalDrivers,
          totalAdmins,
          onlineDrivers,
          pendingOrders,
          activeOrders,
          completedToday,
          revenueToday: revenueToday[0]?.total || 0,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        recentOrders,
        recentLogs,
      });
    } catch (error) {
      logger.error('Admin dashboard error:', error);
      return res.status(500).json({ error: 'Failed to get dashboard' });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const { role, page = 1, limit = 20, search } = req.query;
      const query: any = {};

      if (role) query.role = role;
      if (search) {
        query.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
        ];
      }

      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await User.countDocuments(query);

      return res.json({ users, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get users error:', error);
      return res.status(500).json({ error: 'Failed to get users' });
    }
  }

  async getDrivers(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const query: any = {};
      if (status) query.status = status;

      const drivers = await Driver.find(query)
        .populate('userId', 'firstName lastName photoUrl phone username')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Driver.countDocuments(query);

      return res.json({ drivers, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get drivers error:', error);
      return res.status(500).json({ error: 'Failed to get drivers' });
    }
  }

  async updateDriver(req: AuthRequest, res: Response) {
    try {
      const { driverId } = req.params;
      const updates = req.body;

      const driver = await Driver.findByIdAndUpdate(driverId, updates, { new: true });
      if (!driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'update_driver',
        entity: 'driver',
        entityId: driverId,
        description: `Admin updated driver ${driverId}`,
        metadata: updates,
      });

      return res.json({ driver });
    } catch (error) {
      logger.error('Update driver error:', error);
      return res.status(500).json({ error: 'Failed to update driver' });
    }
  }

  async getOrders(req: AuthRequest, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const query: any = {};
      if (status) query.status = status;

      const orders = await Order.find(query)
        .populate('customerId', 'firstName lastName')
        .populate('driverId', 'car rating')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Order.countDocuments(query);

      return res.json({ orders, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get orders error:', error);
      return res.status(500).json({ error: 'Failed to get orders' });
    }
  }

  async getSettings(req: AuthRequest, res: Response) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({});
      }
      return res.json({ settings });
    } catch (error) {
      logger.error('Get settings error:', error);
      return res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const settings = await Settings.findOneAndUpdate(
        {},
        { $set: req.body },
        { new: true, upsert: true }
      );

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'update_settings',
        entity: 'settings',
        description: 'Admin updated settings',
        metadata: req.body,
      });

      return res.json({ settings });
    } catch (error) {
      logger.error('Update settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  async assignAdmin(req: AuthRequest, res: Response) {
    try {
      const { telegramId } = req.body;
      const user = await User.findOneAndUpdate(
        { telegramId },
        { role: UserRole.ADMIN },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'assign_admin',
        entity: 'user',
        entityId: user._id.toString(),
        description: `Admin assigned to user ${user.firstName}`,
      });

      return res.json({ user });
    } catch (error) {
      logger.error('Assign admin error:', error);
      return res.status(500).json({ error: 'Failed to assign admin' });
    }
  }

  async banUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { isBanned: true },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'ban_user',
        entity: 'user',
        entityId: userId,
        description: `Admin banned user: ${reason || 'No reason provided'}`,
      });

      return res.json({ user });
    } catch (error) {
      logger.error('Ban user error:', error);
      return res.status(500).json({ error: 'Failed to ban user' });
    }
  }

  async unbanUser(req: AuthRequest, res: Response) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.userId,
        { isBanned: false },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (error) {
      logger.error('Unban user error:', error);
      return res.status(500).json({ error: 'Failed to unban user' });
    }
  }

  async getDriversLocations(req: AuthRequest, res: Response) {
    try {
      const drivers = await Driver.find({
        isOnline: true,
        status: 'online',
      })
        .select('userId currentLocation car')
        .populate('userId', 'firstName lastName');

      return res.json({ drivers });
    } catch (error) {
      logger.error('Get drivers locations error:', error);
      return res.status(500).json({ error: 'Failed to get drivers' });
    }
  }

  async getRevenueReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const end = endDate ? new Date(endDate as string) : new Date();

      const revenue = await Order.aggregate([
        {
          $match: {
            status: RideStatus.COMPLETED,
            createdAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$pricing.total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const totalRevenue = revenue.reduce((acc, r) => acc + r.total, 0);
      const totalRides = revenue.reduce((acc, r) => acc + r.count, 0);

      return res.json({ revenue, totalRevenue, totalRides, startDate: start, endDate: end });
    } catch (error) {
      logger.error('Revenue report error:', error);
      return res.status(500).json({ error: 'Failed to get revenue report' });
    }
  }

  async getActivityLogs(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const logs = await ActivityLog.find()
        .populate('userId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await ActivityLog.countDocuments();

      return res.json({ logs, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get logs error:', error);
      return res.status(500).json({ error: 'Failed to get logs' });
    }
  }
}
