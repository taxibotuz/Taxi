import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { PromoCode } from '../models/PromoCode';
import { ActivityLog } from '../models/ActivityLog';
import { logger } from '../config/logger';

export class PromoCodeController {
  async validatePromo(req: AuthRequest, res: Response) {
    try {
      const { code } = req.params;

      const promo = await PromoCode.findOne({
        code: code.toUpperCase(),
        isActive: true,
        startsAt: { $lte: new Date() },
        expiresAt: { $gte: new Date() },
      });

      if (!promo) {
        return res.status(404).json({ error: 'Invalid or expired promo code' });
      }

      if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
        return res.status(400).json({ error: 'Promo code usage limit reached' });
      }

      if (promo.usedBy.includes(req.user!._id as any)) {
        return res.status(400).json({ error: 'Promo code already used by you' });
      }

      return res.json({
        valid: true,
        promo: {
          code: promo.code,
          description: promo.description,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          maxDiscount: promo.maxDiscount,
          minOrderAmount: promo.minOrderAmount,
        },
      });
    } catch (error) {
      logger.error('Validate promo error:', error);
      return res.status(500).json({ error: 'Failed to validate promo code' });
    }
  }

  async createPromo(req: AuthRequest, res: Response) {
    try {
      const promo = await PromoCode.create({
        ...req.body,
        createdBy: req.user!._id,
        code: req.body.code.toUpperCase(),
      });

      await ActivityLog.create({
        userId: req.user!._id,
        action: 'create_promo',
        entity: 'promo',
        entityId: promo._id.toString(),
        description: `Created promo code ${promo.code}`,
      });

      return res.status(201).json({ promo });
    } catch (error) {
      logger.error('Create promo error:', error);
      return res.status(500).json({ error: 'Failed to create promo code' });
    }
  }

  async getPromos(req: AuthRequest, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const promos = await PromoCode.find()
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await PromoCode.countDocuments();

      return res.json({ promos, total, page: +page, pages: Math.ceil(total / +limit) });
    } catch (error) {
      logger.error('Get promos error:', error);
      return res.status(500).json({ error: 'Failed to get promos' });
    }
  }
}
