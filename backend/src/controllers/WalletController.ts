import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Wallet } from '../models/Wallet';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { logger } from '../config/logger';

export class WalletController {
  async getBalance(req: AuthRequest, res: Response) {
    try {
      let wallet = await Wallet.findOne({ userId: req.user!._id });
      if (!wallet) {
        wallet = await Wallet.create({ userId: req.user!._id });
      }

      return res.json({ wallet });
    } catch (error) {
      logger.error('Get balance error:', error);
      return res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  async getTransactions(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const wallet = await Wallet.findOne({ userId: req.user!._id });

      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const orders = await Order.find({
        customerId: req.user!._id,
        paymentStatus: { $in: ['paid', 'refunded'] },
      })
        .select('orderNumber pricing.total paymentStatus createdAt')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Order.countDocuments({
        customerId: req.user!._id,
        paymentStatus: { $in: ['paid', 'refunded'] },
      });

      return res.json({ transactions: orders, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get transactions error:', error);
      return res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  async topUp(req: AuthRequest, res: Response) {
    try {
      const { amount } = req.body;

      if (amount < 1000) {
        return res.status(400).json({ error: 'Minimum top-up is 1000' });
      }

      const wallet = await Wallet.findOneAndUpdate(
        { userId: req.user!._id },
        { $inc: { balance: amount, totalDeposited: amount } },
        { new: true }
      );
      if (!wallet) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      return res.json({
        wallet,
        message: `Successfully added ${amount} to wallet`,
      });
    } catch (error) {
      logger.error('Top up error:', error);
      return res.status(500).json({ error: 'Failed to top up' });
    }
  }
}
