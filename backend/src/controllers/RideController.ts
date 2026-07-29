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
import { RideStatus, PaymentMethod, OrderType, DriverStatus } from '../types';
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

      const geoPickup = GeoService.validatePickupLocation(pickupLat, pickupLng);
      if (!geoPickup.valid) {
        return res.status(403).json({
          success: false,
          error: geoPickup.error,
          field: geoPickup.field,
        });
      }

      const geoDest = GeoService.validateDestinationLocation(destLat, destLng);
      if (!geoDest.valid) {
        return res.status(403).json({
          success: false,
          error: geoDest.error,
          field: geoDest.field,
        });
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
        paymentMethod: PaymentMethod.CASH,
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
          pickup: { address: pickupAddress, coordinates: [pickupLng, pickupLat] },
          destination: { address: destAddress, coordinates: [destLng, destLat] },
          distance,
          duration,
          price: total,
          driverDistance: driver.routeDistanceKm,
          driverEta: driver.routeDurationMin,
          pickupLat,
          pickupLng,
          destLat,
          destLng,
        });
      };

      const customer = await User.findById(req.user!._id).select('firstName lastName phone');

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

          await Driver.findByIdAndUpdate(driver._id, { status: DriverStatus.BUSY, isAvailable: false });

          const driverUser = await User.findById(driver.userId).select('firstName lastName photoUrl phone');
          const acceptedPayload = {
            rideId: order._id,
            orderId: order._id,
            driverId: driver._id,
            driverInfo: {
              firstName: driverUser?.firstName,
              lastName: driverUser?.lastName,
              photoUrl: driverUser?.photoUrl,
              phone: driverUser?.phone,
              car: driver.car,
              rating: driver.rating,
            },
            pickup: { address: pickupAddress, coordinates: [pickupLng, pickupLat] },
            destination: { address: destAddress, coordinates: [destLng, destLat] },
            distance,
            duration,
            price: total,
          };

          SocketService.emitToUser(order.customerId.toString(), 'ride:accepted', acceptedPayload);
          SocketService.emitToDriver(driver._id.toString(), 'ride:accepted', acceptedPayload);
          SocketService.emitToAdmins('admin:ride:update', { rideId: order._id, status: RideStatus.ACCEPTED });
          SocketService.emitToAdmins('admin:driver:update', { driverId: driver._id, status: 'busy' });
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

      SocketService.emitToAdmins('admin:ride:update', { rideId: order._id, status: RideStatus.SEARCHING });

      return res.status(201).json({ order });
    } catch (error) {
      logger.error('Create order error:', error);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  async getOrders(req: AuthRequest, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const cappedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const cappedPage = Math.max(Number(page) || 1, 1);
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
        .skip((cappedPage - 1) * cappedLimit)
        .limit(cappedLimit);

      const total = await Order.countDocuments(query);

      return res.json({ orders, total, page: cappedPage, pages: Math.ceil(total / cappedLimit) });
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

      const prevStatus = order.status;
      order.status = RideStatus.CANCELLED;
      order.cancelledBy = 'customer';
      order.cancelReason = reason;
      order.cancelledAt = new Date();
      await order.save();

      const eventPayload = {
        rideId: order._id,
        reason,
        orderNumber: order.orderNumber,
        prevStatus,
      };

      SocketService.emitToUser(order.customerId.toString(), 'ride:cancelled', eventPayload);

      if (order.driverId) {
        SocketService.emitToDriver(order.driverId.toString(), 'ride:cancelled', eventPayload);

        await Driver.findByIdAndUpdate(order.driverId, {
          $set: { status: DriverStatus.ONLINE, isAvailable: true },
        });
        SocketService.emitToAdmins('admin:driver:update', {
          driverId: order.driverId,
          status: 'online',
        });
      }

      SocketService.emitToAdmins('admin:ride:update', {
        rideId: order._id,
        status: RideStatus.CANCELLED,
        orderNumber: order.orderNumber,
      });

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

      const userRole = req.user!.role;
      const userId = req.user!._id;

      if (userRole === 'customer') {
        const isCustomer = order.customerId.toString() === userId;
        if (!isCustomer) {
          return res.status(403).json({ error: 'Not authorized' });
        }
        const allowedStatuses = ['cancelled'];
        if (!allowedStatuses.includes(status)) {
          return res.status(403).json({ error: 'Customers can only cancel orders' });
        }
      } else if (userRole === 'driver') {
        const driver = await Driver.findOne({ userId });
        if (!driver || !order.driverId || order.driverId.toString() !== driver._id.toString()) {
          return res.status(403).json({ error: 'Not authorized' });
        }
        const allowedStatuses = ['arrived', 'in_progress', 'completed', 'cancelled'];
        if (!allowedStatuses.includes(status)) {
          return res.status(403).json({ error: 'Invalid status transition for driver' });
        }
      }

      const prevStatus = order.status;
      if (prevStatus === status) {
        return res.status(400).json({ error: `Order is already in ${status} status` });
      }

      const validTransitions: Record<string, string[]> = {
        [RideStatus.SEARCHING]: [RideStatus.ACCEPTED, RideStatus.CANCELLED],
        [RideStatus.ACCEPTED]: [RideStatus.ARRIVED, RideStatus.CANCELLED],
        [RideStatus.ARRIVED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
        [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED, RideStatus.CANCELLED],
        [RideStatus.COMPLETED]: [],
        [RideStatus.CANCELLED]: [],
      };

      const allowedNext = validTransitions[prevStatus];
      if (!allowedNext || !allowedNext.includes(status)) {
        return res.status(400).json({ error: `Cannot transition from ${prevStatus} to ${status}` });
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
          if (order.completedAt) {
            return res.status(400).json({ error: 'Order already completed' });
          }
          order.completedAt = new Date();
          order.paymentStatus = 'paid';
          if (order.driverId) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            await Driver.findByIdAndUpdate(order.driverId, {
              $inc: {
                totalRides: 1,
                totalEarnings: order.pricing.total,
                todayEarnings: order.pricing.total,
                weeklyEarnings: order.pricing.total,
                monthlyEarnings: order.pricing.total,
              },
              $set: { status: DriverStatus.ONLINE, isAvailable: true },
            });

            SocketService.emitToAdmins('admin:driver:update', {
              driverId: order.driverId,
              status: 'online',
              earnings: order.pricing.total,
            });

            SocketService.onRideCompleted(order.driverId.toString());
          }
          break;
        case RideStatus.CANCELLED:
          order.cancelledAt = new Date();
          order.cancelledBy = userRole === 'customer' ? 'customer' : 'driver';
          if (order.driverId) {
            await Driver.findByIdAndUpdate(order.driverId, {
              $set: { status: DriverStatus.ONLINE, isAvailable: true },
            });
            SocketService.emitToAdmins('admin:driver:update', {
              driverId: order.driverId,
              status: 'online',
            });
          }
          break;
      }

      await order.save();

      const eventPayload = {
        rideId: order._id,
        orderId: order._id,
        status,
        orderNumber: order.orderNumber,
        updatedAt: new Date(),
        prevStatus,
      };

      SocketService.emitToUser(order.customerId.toString(), `ride:${status}`, eventPayload);

      if (order.driverId) {
        SocketService.emitToDriver(order.driverId.toString(), `ride:${status}`, eventPayload);
      }

      SocketService.emitToAdmins('admin:ride:update', {
        rideId: order._id,
        orderId: order._id,
        status,
        orderNumber: order.orderNumber,
      });

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
