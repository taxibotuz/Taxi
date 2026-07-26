import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Driver, IDriver } from '../models/Driver';
import { User } from '../models/User';
import { PricingService } from '../services/PricingService';
import { DriverMatchingService, DriverWithRoute } from '../services/DriverMatchingService';
import { GeoService } from '../services/GeoService';
import { SocketService } from '../sockets/SocketService';
import { TelegramBot } from '../bot';
import { RideStatus, PaymentMethod, OrderType } from '../types';
import { logger } from '../config/logger';

const pricingService = new PricingService();
const driverMatchingService = DriverMatchingService.getInstance();

export class RideController {
  async createOrder(req: AuthRequest, res: Response) {
    try {
      const {
        pickupLat,
        pickupLng,
        pickupAddress,
        destLat,
        destLng,
        destAddress,
        distance,
        duration,
        paymentMethod,
        comment,
        offeredPrice,
        promoCode,
      } = req.body;

      const geoPickup = GeoService.validateLocation(pickupLat, pickupLng);
      if (!geoPickup.valid) {
        return res.status(400).json({ error: geoPickup.error });
      }

      const geoDest = GeoService.validateLocation(destLat, destLng);
      if (!geoDest.valid) {
        return res.status(400).json({ error: geoDest.error });
      }

      const now = new Date();
      const hour = now.getHours();
      const isNight = pricingService.isNightTime(hour);
      const isRush = pricingService.isRushHour(hour);

      const priceBreakdown = await pricingService.calculatePrice(
        distance,
        duration,
        1.0,
        isNight,
        isRush
      );

      const total = offeredPrice || priceBreakdown.total;

      const order = await Order.create({
        type: OrderType.RIDE,
        customerId: req.user!._id,
        status: RideStatus.SEARCHING,
        pickup: {
          type: 'Point',
          coordinates: [pickupLng, pickupLat],
          address: pickupAddress,
        },
        destination: {
          type: 'Point',
          coordinates: [destLng, destLat],
          address: destAddress,
        },
        distance,
        duration,
        pricing: {
          ...priceBreakdown,
          subtotal: priceBreakdown.total,
          total,
          promoCode,
        },
        paymentMethod: paymentMethod || PaymentMethod.CASH,
        comment,
        offeredPrice,
      });

      const notifyDriver = async (driver: DriverWithRoute, index: number) => {
        const user = await User.findById(driver.userId);
        if (user?.telegramId) {
          TelegramBot.getInstance().sendRideRequest(user.telegramId, {
            rideId: order._id.toString(),
            pickupAddress,
            destAddress,
            pickupLat,
            pickupLng,
            destLat,
            destLng,
            tripDistance: distance,
            tripDuration: duration,
            driverDistance: driver.routeDistanceKm,
            driverEta: driver.routeDurationMin,
            price: total,
          });
        }
        SocketService.emitToDriver(driver._id.toString(), 'ride:request', {
          rideId: order._id.toString(),
          pickupAddress,
          destAddress,
          distance,
          price: total,
        });
      };

      driverMatchingService.startSearch(
        order._id.toString(),
        pickupLat,
        pickupLng,
        destLat,
        destLng,
        destAddress,
        pickupAddress,
        distance,
        total,
        async (driver) => {
          order.driverId = driver._id;
          order.status = RideStatus.ACCEPTED;
          order.acceptedAt = new Date();
          await order.save();

          SocketService.emitToUser(order.customerId.toString(), 'ride:accepted', {
            rideId: order._id,
            driverId: driver._id,
            driverInfo: {
              firstName: (driver as any).user?.firstName,
              photoUrl: (driver as any).user?.photoUrl,
              car: driver.car,
              rating: driver.rating,
            },
          });
        },
        async () => {
          order.status = RideStatus.CANCELLED;
          order.cancelledBy = 'system';
          order.cancelReason = 'No drivers available';
          order.cancelledAt = new Date();
          await order.save();

          await TelegramBot.getInstance().deleteRideMessages(order._id.toString());

          SocketService.emitToUser(order.customerId.toString(), 'search:status', {
            rideId: order._id,
            status: 'timeout',
          });
        },
        notifyDriver
      );

      SocketService.emitToUser(req.user!._id, 'search:status', {
        rideId: order._id,
        status: 'searching',
      });

      return res.status(201).json({ order });
    } catch (error) {
      logger.error('Create order error:', error);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async getOrders(req: AuthRequest, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const query: any = {};

      if (req.user!.role === 'customer') {
        query.customerId = req.user!._id;
      } else if (req.user!.role === 'driver') {
        const driver = await Driver.findOne({ userId: req.user!._id });
        if (driver) query.driverId = driver._id;
      }

      if (status) query.status = status;

      const orders = await Order.find(query)
        .populate('customerId', 'firstName lastName photoUrl phone')
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
      const order = await Order.findById(req.params.id)
        .populate('customerId', 'firstName lastName photoUrl phone')
        .populate('driverId', 'car rating');

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json({ order });
    } catch (error) {
      logger.error('Get order error:', error);
      return res.status(500).json({ error: 'Failed to get order' });
    }
  }

  async cancelOrder(req: AuthRequest, res: Response) {
    try {
      const { reason } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.customerId.toString() !== req.user!._id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (![RideStatus.PENDING, RideStatus.SEARCHING, RideStatus.ACCEPTED].includes(order.status as RideStatus)) {
        return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
      }

      order.status = RideStatus.CANCELLED;
      order.cancelledBy = 'customer';
      order.cancelReason = reason;
      order.cancelledAt = new Date();
      await order.save();

      if (order.driverId) {
        SocketService.emitToDriver(order.driverId.toString(), 'ride:cancelled', {
          rideId: order._id,
          reason,
        });
      }

      return res.json({ order });
    } catch (error) {
      logger.error('Cancel order error:', error);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }
  }

  async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      order.status = status;

      switch (status) {
        case RideStatus.ARRIVED:
          order.arrivedAt = new Date();
          break;
        case RideStatus.IN_PROGRESS:
          order.startedAt = new Date();
          break;
        case RideStatus.COMPLETED:
          order.completedAt = new Date();
          order.paymentStatus = 'paid';
          if (order.driverId) {
            await Driver.findByIdAndUpdate(order.driverId, {
              $inc: { totalRides: 1, totalEarnings: order.pricing.total, todayEarnings: order.pricing.total },
              $set: { status: 'online' },
            });
          }
          break;
      }

      await order.save();

      SocketService.emitToUser(order.customerId.toString(), `ride:${status}`, {
        rideId: order._id,
      });

      if (order.driverId) {
        SocketService.emitToDriver(order.driverId.toString(), `ride:${status}`, {
          rideId: order._id,
        });
      }

      return res.json({ order });
    } catch (error) {
      logger.error('Update order status error:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  async estimatePrice(req: AuthRequest, res: Response) {
    try {
      const distance = Number(req.query.distance);
      const duration = Number(req.query.duration);
      const now = new Date();
      const hour = now.getHours();
      const isNight = pricingService.isNightTime(hour);
      const isRush = pricingService.isRushHour(hour);

      const price = await pricingService.calculatePrice(distance, duration, 1.0, isNight, isRush);

      return res.json({ price });
    } catch (error) {
      logger.error('Price estimate error:', error);
      return res.status(500).json({ error: 'Failed to estimate price' });
    }
  }
}
