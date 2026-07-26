import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../config/logger';
import { Driver } from '../models/Driver';
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

    this.driverMatchingService = new DriverMatchingService();

    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token as string, config.jwt.secret) as any;
        (socket as any).user = decoded;
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
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
            () => {
              this.io.to(`user:${userId}`).emit('ride:accepted', {
                rideId: data.rideId,
                driverId: driver._id,
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
}
