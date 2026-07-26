import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Driver } from '../models/Driver';
import { config } from '../config';
import { UserRole, DriverStatus } from '../types';
import { logger } from '../config/logger';

export class AuthController {
  async telegramLogin(req: AuthRequest, res: Response) {
    try {
      const { id, first_name, last_name: lastName, username, photo_url } = req.body;

      logger.info('=== AUTH TRACE: telegramLogin ===', { telegramId: id, bodyFirst: first_name });
      logger.info(`TELEGRAM_ADMIN_IDS from config: [${config.telegram.adminIds.join(',')}]`);
      logger.info(`User IS admin ID: ${config.telegram.adminIds.includes(id)}`);

      if (!id) {
        return res.status(400).json({ error: 'Telegram ID is required' });
      }

      let user = await User.findOne({ telegramId: id });

      if (user) {
        user.firstName = first_name || user.firstName;
        if (lastName) user.lastName = lastName;
        user.username = username || user.username;
        if (photo_url) user.photoUrl = photo_url;
        if (config.telegram.adminIds.includes(id) && user.role !== UserRole.ADMIN) {
          user.role = UserRole.ADMIN;
        }
        await user.save();
        logger.info('=== AUTH TRACE: User found in DB ===', { telegramId: id, dbRole: user.role, isAdmin: user.role === UserRole.ADMIN });
      } else {
        const role = config.telegram.adminIds.includes(id)
          ? UserRole.ADMIN
          : UserRole.CUSTOMER;
        user = await User.create({
          telegramId: id,
          firstName: first_name || 'User',
          lastName,
          username,
          photoUrl: photo_url,
          role,
        });

        await Wallet.create({ userId: user._id });
        logger.info('=== AUTH TRACE: New user created ===', { telegramId: id, assignedRole: role });
      }

      if (user.isBanned) {
        return res.status(403).json({ error: 'Account is banned' });
      }

      const token = jwt.sign(
        {
          _id: user._id.toString(),
          telegramId: user.telegramId,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      );

      const jwtPayload = { _id: user._id.toString(), telegramId: user.telegramId, role: user.role };
      logger.info('=== AUTH TRACE: JWT signed ===', { jwtPayload });
      logger.info('=== AUTH TRACE: Response user.role ===', { role: user.role });
      logger.info('=== AUTH TRACE: END telegramLogin ===');

      return res.json({
        token,
        user: {
          _id: user._id,
          telegramId: user.telegramId,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          photoUrl: user.photoUrl,
          role: user.role,
          phone: user.phone,
          language: user.language,
        },
      });
    } catch (error) {
      logger.error('Telegram login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user!._id).select('-__v');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let driverInfo = null;
      if (user.role === UserRole.DRIVER) {
        driverInfo = await Driver.findOne({ userId: user._id });
      }

      return res.json({ user, driver: driverInfo });
    } catch (error) {
      logger.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { phone, language } = req.body;
      const user = await User.findByIdAndUpdate(
        req.user!._id,
        { $set: { phone, language } },
        { new: true }
      ).select('-__v');

      return res.json({ user });
    } catch (error) {
      logger.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async becomeDriver(req: AuthRequest, res: Response) {
    try {
      const existingDriver = await Driver.findOne({ userId: req.user!._id });
      if (existingDriver) {
        return res.status(400).json({ error: 'Already registered as driver' });
      }

      const { brand, model, year, color, plateNumber, seats } = req.body;

      const driver = await Driver.create({
        userId: req.user!._id,
        car: { brand, model, year, color, plateNumber, seats: seats || 4 },
        status: DriverStatus.OFFLINE,
        isApproved: false,
      });

      await User.findByIdAndUpdate(req.user!._id, { role: UserRole.DRIVER });

      return res.status(201).json({ driver });
    } catch (error) {
      logger.error('Become driver error:', error);
      return res.status(500).json({ error: 'Failed to register as driver' });
    }
  }

  async verifyToken(req: AuthRequest, res: Response) {
    logger.info('=== AUTH TRACE: verifyToken ===', { user: req.user });
    return res.json({
      valid: true,
      user: req.user,
    });
  }

  async debugAuth(req: AuthRequest, res: Response) {
    const user = await User.findById(req.user!._id).select('-__v');
    logger.info('=== AUTH TRACE: debugAuth ===', {
      telegramId: user?.telegramId,
      dbRole: user?.role,
      jwtUser: req.user,
      adminIds: config.telegram.adminIds,
      isAdminId: config.telegram.adminIds.includes(user?.telegramId || 0),
    });
    return res.json({
      telegramId: user?.telegramId,
      dbRole: user?.role,
      jwtRole: req.user?.role,
      adminIds: config.telegram.adminIds,
      isAdminId: config.telegram.adminIds.includes(user?.telegramId || 0),
      user,
    });
  }
}
