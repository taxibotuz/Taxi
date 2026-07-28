import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/logger';
import { ErrorReporter } from '../services/ErrorReporter';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { RideStatus } from '../types';
import { DriverMatchingService } from '../services/DriverMatchingService';
import { LocationBatcher } from '../services/LocationBatcher';

export class SocketService {
  private static io: Server;
  private static userSockets: Map<string, string[]> = new Map();
  private static driverMatchingService: DriverMatchingService;
  private static locationBatcher: LocationBatcher;
  private static driverCustomerMap: Map<string, string> = new Map();

  static initialize(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.driverMatchingService = DriverMatchingService.getInstance();
    this.locationBatcher = LocationBatcher.getInstance();

    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token as string, config.jwt.secret) as any;
        const user = await User.findById(decoded._id).select('-__v');
        if (!user || user.isBanned || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }
        socket.data.user = decoded;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      logger.info(`Socket connected: ${user._id} (${user.role})`);

      const userId = user._id;
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, []);
      }
      this.userSockets.get(userId)!.push(socket.id);

      socket.join(`user:${userId}`);
      if (user.role === 'admin') {
        socket.join('admins');
      }

      socket.on('location:update', async (data: { lat: number; lng: number }) => {
        try {
          const driver = await Driver.findOne({ userId });
          if (!driver) return;

          this.locationBatcher.queueUpdate(driver._id.toString(), data.lng, data.lat);

          this.io.to('admins').emit('driver:location', {
            driverId: driver._id,
            lat: data.lat,
            lng: data.lng,
          });

          const activeOrder = await Order.findOne({
            driverId: driver._id,
            status: { $in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS] },
          }).select('customerId');

          if (activeOrder) {
            this.io.to(`user:${activeOrder.customerId.toString()}`).emit('driver:location', {
              driverId: driver._id,
              lat: data.lat,
              lng: data.lng,
              orderId: activeOrder._id,
            });
          }
        } catch (error) {
          logger.error('Location update error:', error);
        }
      });

      socket.on('ride:accept', async (data: { rideId: string }) => {
        try {
          const driver = await Driver.findOne({ userId });
          if (!driver) return;

          this.driverMatchingService.acceptRide(
            driver._id.toString(),
            data.rideId,
            async (notifiedDriverIds: string[]) => {
              const order = await Order.findById(data.rideId);
              if (!order || order.status !== RideStatus.SEARCHING) return;

              order.driverId = driver._id;
              order.status = RideStatus.ACCEPTED;
              order.acceptedAt = new Date();
              await order.save();

              this.driverCustomerMap.set(driver._id.toString(), order.customerId.toString());

              const driverUser = await User.findById(driver.userId).select('firstName lastName phone photoUrl');

              const acceptedPayload = {
                rideId: data.rideId,
                driverId: driver._id,
                driverInfo: {
                  firstName: driverUser?.firstName,
                  lastName: driverUser?.lastName,
                  phone: driverUser?.phone,
                  photoUrl: driverUser?.photoUrl,
                  car: driver.car,
                  rating: driver.rating,
                },
              };

              this.io.to(`user:${userId}`).emit('ride:accepted', acceptedPayload);
              this.io.to(`user:${order.customerId.toString()}`).emit('ride:accepted', acceptedPayload);
            },
            () => {
              socket.emit('ride:taken', { rideId: data.rideId });
            }
          );
        } catch (error) {
          logger.error('Ride accept error:', error);
        }
      });

      socket.on('ride:reject', async (data: { rideId: string; reason?: string }) => {
        try {
          const driver = await Driver.findOne({ userId });
          if (!driver) return;

          const order = await Order.findById(data.rideId);
          if (!order) return;

          if (!order.rejectedDrivers.includes(driver._id)) {
            order.rejectedDrivers.push(driver._id);
            await order.save();
          }

          await this.driverMatchingService.removeDriverFromNotified(data.rideId, driver._id.toString());

          socket.emit('ride:rejected', { rideId: data.rideId });
        } catch (error) {
          logger.error('Ride reject error:', error);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${userId}`);
        const sockets = this.userSockets.get(userId) || [];
        const idx = sockets.indexOf(socket.id);
        if (idx > -1) sockets.splice(idx, 1);
        if (sockets.length === 0) this.userSockets.delete(userId);
      });
    });

    this.io.engine.on('connection_error', (err: any) => {
      logger.error('Socket.io connection error:', err);
      ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'socket_io', metadata: { code: err.code } });
    });

    logger.info('Socket.io initialized');
  }

  static emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  static async emitToDriver(driverId: string, event: string, data: any) {
    try {
      const driver = await Driver.findById(driverId).select('userId');
      if (!driver) return;
      this.io.to(`user:${driver.userId.toString()}`).emit(event, data);
    } catch (error) {
      logger.error(`Failed to emit to driver ${driverId}:`, error);
    }
  }

  static emitToAdmins(event: string, data: any) {
    this.io.to('admins').emit(event, data);
  }

  static broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  static setDriverCustomer(driverId: string, customerId: string) {
    this.driverCustomerMap.set(driverId, customerId);
  }

  static clearDriverCustomer(driverId: string) {
    this.driverCustomerMap.delete(driverId);
  }

  static onRideCompleted(driverId: string) {
    this.clearDriverCustomer(driverId);
  }

  static close() {
    if (this.io) {
      this.io.close();
    }
    if (this.locationBatcher) {
      this.locationBatcher.stop();
    }
  }
}
