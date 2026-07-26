import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { RideStatus } from '../types';
import { DriverMatchingService } from '../services/DriverMatchingService';

export class SocketService {
  private static io: Server;
  private static userSockets: Map<string, string[]> = new Map();
  private static driverMatchingService: DriverMatchingService;

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
          if (driver) {
            await driver.updateOne({
              'currentLocation.coordinates': [data.lng, data.lat],
              'currentLocation.updatedAt': new Date(),
            });

            this.io.to('admins').emit('driver:location', {
              driverId: driver._id,
              lat: data.lat,
              lng: data.lng,
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
            async () => {
              const order = await Order.findById(data.rideId);
              if (!order || order.status !== RideStatus.SEARCHING) return;

              order.driverId = driver._id;
              order.status = RideStatus.ACCEPTED;
              order.acceptedAt = new Date();
              await order.save();

              this.io.to(`user:${userId}`).emit('ride:accepted', {
                rideId: data.rideId,
                driverId: driver._id,
                driverInfo: {
                  car: driver.car,
                  rating: driver.rating,
                },
              });

              this.io.to(`user:${order.customerId.toString()}`).emit('ride:accepted', {
                rideId: data.rideId,
                driverId: driver._id,
                driverInfo: {
                  car: driver.car,
                  rating: driver.rating,
                },
              });
            },
            () => {
              socket.emit('ride:taken', { rideId: data.rideId });
            }
          );
        } catch (error) {
          logger.error('Ride accept error:', error);
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

    logger.info('Socket.io initialized');
  }

  static emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  static emitToDriver(driverId: string, event: string, data: any) {
    this.io.to(`user:${driverId}`).emit(event, data);
  }

  static emitToAdmins(event: string, data: any) {
    this.io.to('admins').emit(event, data);
  }

  static broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }

  static close() {
    if (this.io) {
      this.io.close();
    }
  }
}
