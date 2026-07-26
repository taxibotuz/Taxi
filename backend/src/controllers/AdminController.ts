import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { Settings } from '../models/Settings';
import { Wallet } from '../models/Wallet';
import { Notification } from '../models/Notification';
import { ActivityLog } from '../models/ActivityLog';
import { TelegramBot } from '../bot';
import { UserRole, RideStatus } from '../types';
import { logger } from '../config/logger';

export class AdminController {
  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [
        totalUsers, totalDrivers, totalAdmins, onlineDrivers,
        pendingOrders, activeOrders, completedToday, cancelledToday,
        revenueToday, revenueWeek, revenueMonth, totalRevenue,
        recentOrders, recentLogs, recentUsers, recentDrivers,
      ] = await Promise.all([
        User.countDocuments({ role: UserRole.CUSTOMER }),
        User.countDocuments({ role: UserRole.DRIVER }),
        User.countDocuments({ role: UserRole.ADMIN }),
        Driver.countDocuments({ isOnline: true, status: 'online' }),
        Order.countDocuments({ status: RideStatus.PENDING }),
        Order.countDocuments({ status: { $in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] } }),
        Order.countDocuments({ status: RideStatus.COMPLETED, createdAt: { $gte: today } }),
        Order.countDocuments({ status: RideStatus.CANCELLED, createdAt: { $gte: today } }),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: weekStart } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.find().sort({ createdAt: -1 }).limit(10).populate('customerId', 'firstName lastName'),
        ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName'),
        User.find().sort({ createdAt: -1 }).limit(10).select('firstName lastName username photoUrl role'),
        Driver.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'firstName lastName photoUrl'),
      ]);

      return res.json({
        stats: {
          totalUsers, totalDrivers, totalAdmins, onlineDrivers,
          pendingOrders, activeOrders, completedToday, cancelledToday,
          revenueToday: revenueToday[0]?.total || 0,
          revenueWeek: revenueWeek[0]?.total || 0,
          revenueMonth: revenueMonth[0]?.total || 0,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
        recentOrders, recentLogs, recentUsers, recentDrivers,
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
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { firstName: { $regex: escaped, $options: 'i' } },
          { lastName: { $regex: escaped, $options: 'i' } },
          { username: { $regex: escaped, $options: 'i' } },
          { phone: { $regex: escaped, $options: 'i' } },
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

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.params.userId).select('-__v');
      if (!user) return res.status(404).json({ error: 'User not found' });

      const [orderCount, totalSpent, recentOrders] = await Promise.all([
        Order.countDocuments({ customerId: user._id }),
        Order.aggregate([
          { $match: { customerId: user._id, status: RideStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
        Order.find({ customerId: user._id })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('driverId', 'car rating'),
      ]);

      return res.json({
        user,
        stats: {
          totalRides: orderCount,
          totalSpent: totalSpent[0]?.total || 0,
        },
        recentOrders,
      });
    } catch (error) {
      logger.error('Get user error:', error);
      return res.status(500).json({ error: 'Failed to get user' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      const user = await User.findByIdAndDelete(req.params.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });

      await Driver.deleteOne({ userId: user._id });
      await Wallet.deleteOne({ userId: user._id });
      await Notification.deleteMany({ userId: user._id });

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'delete_user',
        entity: 'user',
        entityId: req.params.userId,
        description: `Admin deleted user ${user.firstName}`,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Delete user error:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  async getDrivers(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status, search, isApproved } = req.query;
      const query: any = {};
      if (status) query.status = status;
      if (isApproved !== undefined) query.isApproved = isApproved === 'true';

      const driverIds: string[] = [];
      if (search) {
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchedUsers = await User.find({
          $or: [
            { firstName: { $regex: escaped, $options: 'i' } },
            { lastName: { $regex: escaped, $options: 'i' } },
            { phone: { $regex: escaped, $options: 'i' } },
          ],
        }).select('_id');
        driverIds.push(...matchedUsers.map((u) => u._id.toString()));
        if (driverIds.length > 0) query.userId = { $in: driverIds };
        else return res.json({ drivers: [], total: 0, page: 1, pages: 0 });
      }

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

  async getDriverById(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findById(req.params.driverId)
        .populate('userId', 'firstName lastName photoUrl phone username telegramId language isBanned isActive');

      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      const [orderCount, totalRevenue] = await Promise.all([
        Order.countDocuments({ driverId: driver._id }),
        Order.aggregate([
          { $match: { driverId: driver._id, status: RideStatus.COMPLETED } },
          { $group: { _id: null, total: { $sum: '$pricing.total' } } },
        ]),
      ]);

      return res.json({
        driver,
        stats: { totalRides: orderCount, totalRevenue: totalRevenue[0]?.total || 0 },
      });
    } catch (error) {
      logger.error('Get driver error:', error);
      return res.status(500).json({ error: 'Failed to get driver' });
    }
  }

  async deleteDriver(req: AuthRequest, res: Response) {
    try {
      const driver = await Driver.findByIdAndDelete(req.params.driverId);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'delete_driver',
        entity: 'driver',
        entityId: req.params.driverId,
        description: `Admin deleted driver ${req.params.driverId}`,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Delete driver error:', error);
      return res.status(500).json({ error: 'Failed to delete driver' });
    }
  }

  private static readonly ALLOWED_DRIVER_UPDATES = [
    'status', 'isOnline', 'isAvailable', 'isApproved', 'isSuspended',
    'isBlacklisted', 'car.brand', 'car.model', 'car.color', 'car.plateNumber',
    'car.year', 'car.seats', 'commission', 'maxRadius', 'maxRidesPerDay',
    'rating',
  ];

  async updateDriver(req: AuthRequest, res: Response) {
    try {
      const { driverId } = req.params;
      const updates: Record<string, any> = {};
      for (const key of AdminController.ALLOWED_DRIVER_UPDATES) {
        if (key in req.body) updates[key] = req.body[key];
      }
      if (req.body.car) {
        for (const field of ['brand', 'model', 'color', 'plateNumber', 'year', 'seats']) {
          if (req.body.car[field] !== undefined) updates[`car.${field}`] = req.body.car[field];
        }
      }

      const driver = await Driver.findByIdAndUpdate(driverId, updates, { new: true });
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

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
      const { status, page = 1, limit = 20, search, paymentMethod, startDate, endDate } = req.query;
      const query: any = {};
      if (status) query.status = status;
      if (paymentMethod) query.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) query.createdAt.$lte = new Date(endDate as string);
      }

      const orderIds: string[] = [];
      if (search) {
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchedUsers = await User.find({
          $or: [
            { firstName: { $regex: escaped, $options: 'i' } },
            { lastName: { $regex: escaped, $options: 'i' } },
          ],
        }).select('_id');
        const matchedUserIds = matchedUsers.map((u) => u._id);
        const matchedOrders = await Order.find({
          $or: [
            { customerId: { $in: matchedUserIds } },
            { orderNumber: { $regex: escaped, $options: 'i' } },
          ],
        }).select('_id');
        orderIds.push(...matchedOrders.map((o) => o._id.toString()));
        if (orderIds.length > 0) query._id = { $in: orderIds };
        else return res.json({ orders: [], total: 0, page: 1, pages: 0 });
      }

      const orders = await Order.find(query)
        .populate('customerId', 'firstName lastName phone')
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

  async getOrderById(req: AuthRequest, res: Response) {
    try {
      const order = await Order.findById(req.params.orderId)
        .populate('customerId', 'firstName lastName phone photoUrl')
        .populate('driverId', 'car rating status')
        .populate({
          path: 'driverId',
          populate: { path: 'userId', select: 'firstName lastName phone' },
        });

      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.json({ order });
    } catch (error) {
      logger.error('Get order error:', error);
      return res.status(500).json({ error: 'Failed to get order' });
    }
  }

  async assignDriver(req: AuthRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });

      order.driverId = driver._id;
      order.status = RideStatus.ACCEPTED;
      order.acceptedAt = new Date();
      await order.save();

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'assign_driver',
        entity: 'order',
        entityId: orderId,
        description: `Admin assigned driver ${driverId} to order ${order.orderNumber}`,
      });

      return res.json({ order });
    } catch (error) {
      logger.error('Assign driver error:', error);
      return res.status(500).json({ error: 'Failed to assign driver' });
    }
  }

  async cancelOrder(req: AuthRequest, res: Response) {
    try {
      const { reason } = req.body;
      const order = await Order.findById(req.params.orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });

      order.status = RideStatus.CANCELLED;
      order.cancelledBy = 'admin';
      order.cancelReason = reason || 'Cancelled by admin';
      order.cancelledAt = new Date();
      await order.save();

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'cancel_order',
        entity: 'order',
        entityId: req.params.orderId,
        description: `Admin cancelled order ${order.orderNumber}: ${reason || 'No reason'}`,
      });

      return res.json({ order });
    } catch (error) {
      logger.error('Cancel order error:', error);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }
  }

  async getSettings(req: AuthRequest, res: Response) {
    try {
      let settings = await Settings.findOne();
      if (!settings) settings = await Settings.create({});
      return res.json({ settings });
    } catch (error) {
      logger.error('Get settings error:', error);
      return res.status(500).json({ error: 'Failed to get settings' });
    }
  }

  async updateSettings(req: AuthRequest, res: Response) {
    try {
      const allowedKeys = ['pricing', 'search', 'driver', 'features', 'payment', 'maintenance', 'notifications', 'general'];
      const updates: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (key in req.body) updates[key] = req.body[key];
      }

      const settings = await Settings.findOneAndUpdate(
        {},
        { $set: updates },
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
      if (!user) return res.status(404).json({ error: 'User not found' });

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
      const user = await User.findByIdAndUpdate(userId, { isBanned: true }, { new: true });
      if (!user) return res.status(404).json({ error: 'User not found' });

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
      const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: false }, { new: true });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user });
    } catch (error) {
      logger.error('Unban user error:', error);
      return res.status(500).json({ error: 'Failed to unban user' });
    }
  }

  async getDriversLocations(req: AuthRequest, res: Response) {
    try {
      const drivers = await Driver.find({ isOnline: true, status: 'online' })
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
        { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } },
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

  async getReports(req: AuthRequest, res: Response) {
    try {
      const { period = 'daily' } = req.query;
      const now = new Date();
      let start: Date;

      switch (period) {
        case 'yearly':
          start = new Date(now.getFullYear() - 1, 0, 1);
          break;
        case 'monthly':
          start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          break;
        case 'weekly':
          start = new Date(now);
          start.setDate(start.getDate() - 60);
          break;
        default:
          start = new Date(now);
          start.setDate(start.getDate() - 30);
      }

      const groupFormat = period === 'yearly' ? '%Y' : period === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

      const [revenue, topDrivers, topCustomers] = await Promise.all([
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, createdAt: { $gte: start, $lte: now } } },
          { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$pricing.total' }, rides: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, driverId: { $ne: null } } },
          { $group: { _id: '$driverId', rides: { $sum: 1 }, revenue: { $sum: '$pricing.total' } } },
          { $sort: { rides: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'drivers', localField: '_id', foreignField: '_id', as: 'driver' } },
          { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
          { $lookup: { from: 'users', localField: 'driver.userId', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, rides: 1, revenue: 1, 'user.firstName': 1, 'user.lastName': 1, 'user.phone': 1 } },
        ]),
        Order.aggregate([
          { $match: { status: RideStatus.COMPLETED, customerId: { $ne: null } } },
          { $group: { _id: '$customerId', rides: { $sum: 1 }, spent: { $sum: '$pricing.total' } } },
          { $sort: { rides: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, rides: 1, spent: 1, 'user.firstName': 1, 'user.lastName': 1, 'user.phone': 1 } },
        ]),
      ]);

      return res.json({ revenue, topDrivers, topCustomers, period });
    } catch (error) {
      logger.error('Reports error:', error);
      return res.status(500).json({ error: 'Failed to get reports' });
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

  async sendBroadcast(req: AuthRequest, res: Response) {
    try {
      const { title, body, type = 'system', target = 'all' } = req.body;
      if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

      let userQuery: any = { isActive: true };
      if (target === 'drivers') userQuery.role = UserRole.DRIVER;
      else if (target === 'users') userQuery.role = UserRole.CUSTOMER;

      const users = await User.find(userQuery).select('_id');
      if (users.length === 0) return res.status(404).json({ error: 'No users found' });

      const notifications = users.map((u) => ({
        userId: u._id,
        title,
        body,
        type,
        isSent: true,
      }));

      await Notification.insertMany(notifications);

      for (const user of users) {
        const fullUser = await User.findById(user._id);
        if (fullUser?.telegramId) {
          TelegramBot.getInstance().sendNotification(fullUser.telegramId, `${title}\n\n${body}`);
        }
      }

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'broadcast',
        entity: 'notification',
        description: `Admin sent broadcast to ${target}: ${title}`,
      });

      return res.json({ success: true, count: users.length });
    } catch (error) {
      logger.error('Broadcast error:', error);
      return res.status(500).json({ error: 'Failed to send broadcast' });
    }
  }
}
