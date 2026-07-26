import mongoose from 'mongoose';
import { Driver, IDriver } from '../models/Driver';
import { Settings } from '../models/Settings';
import { RedisService } from './RedisService';
import { RoutingService, RouteResult } from './RoutingService';
import { logger } from '../config/logger';

export interface DriverWithRoute extends IDriver {
  routeDistanceKm: number;
  routeDurationMin: number;
  user?: any;
}

export class DriverMatchingService {
  private static _instance: DriverMatchingService;
  private redis: RedisService;
  private rideExpiryTimers: Map<string, NodeJS.Timeout> = new Map();
  private rideNotifiedDrivers: Map<string, string[]> = new Map();

  constructor() {
    this.redis = RedisService.getInstance();
  }

  static getInstance(): DriverMatchingService {
    if (!DriverMatchingService._instance) {
      DriverMatchingService._instance = new DriverMatchingService();
    }
    return DriverMatchingService._instance;
  }

  async findNearestDrivers(
    lat: number,
    lng: number,
    radiusKm?: number,
    limit?: number
  ): Promise<DriverWithRoute[]> {
    const settings = await Settings.findOne();
    const maxRadius = radiusKm || settings?.search.maxRadius || 15;
    const maxDrivers = limit || settings?.search.maxDriversPerSearch || 10;

    const district = settings?.district || { enabled: true, boundary: [] };

    const polygonCoords = district.enabled && district.boundary.length >= 3
      ? [
          ...district.boundary.map((p: { lat: number; lng: number }) => [p.lng, p.lat]),
          [district.boundary[0].lng, district.boundary[0].lat],
        ]
      : null;

    const matchStage: Record<string, any> = {
      status: 'online',
      isOnline: true,
      isAvailable: true,
      isApproved: true,
      isSuspended: false,
      isBlacklisted: false,
    };

    if (polygonCoords) {
      matchStage.currentLocation = {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [polygonCoords],
          },
        },
      };
    }

    const drivers = await Driver.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: maxRadius * 1000,
          spherical: true,
        },
      },
      { $match: matchStage },
      { $sort: { distance: 1 } },
      { $limit: maxDrivers },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);

    if (drivers.length === 0) return [];

    const driversWithRoutes = await RoutingService.getRoutesBatch(
      drivers.map((d: any) => ({
        lng: d.currentLocation.coordinates[0],
        lat: d.currentLocation.coordinates[1],
      })),
      lng,
      lat
    );

    const result: DriverWithRoute[] = drivers.map((d: any, i: number) => ({
      ...d,
      routeDistanceKm: driversWithRoutes[i].distanceKm,
      routeDurationMin: driversWithRoutes[i].durationMin,
    }));

    result.sort((a, b) => a.routeDistanceKm - b.routeDistanceKm);

    return result;
  }

  async startSearch(
    rideId: string,
    pickupLat: number,
    pickupLng: number,
    destLat: number,
    destLng: number,
    destAddress: string,
    pickupAddress: string,
    tripDistanceKm: number,
    totalPrice: number,
    onFound: (driver: DriverWithRoute) => void,
    onTimeout: () => void,
    onNotifyDriver: (driver: DriverWithRoute, index: number) => void = () => {}
  ): Promise<void> {
    const settings = await Settings.findOne();
    const maxExpansions = settings?.search.maxExpansions || 3;
    const expansionStep = settings?.search.expansionStep || 5;
    const maxDriversToNotify = settings?.search.maxDriversToNotify || 5;
    const rideExpirySeconds = settings?.search.rideExpirySeconds || 30;

    let currentRadius = settings?.search.maxRadius || 15;
    this.rideNotifiedDrivers.set(rideId, []);

    const attemptSearch = async (expansion: number = 0) => {
      if (expansion >= maxExpansions) {
        this.cleanupRide(rideId);
        onTimeout();
        return;
      }

      try {
        const drivers = await this.findNearestDrivers(pickupLat, pickupLng, currentRadius, maxDriversToNotify);

        if (drivers.length > 0) {
          this.rideNotifiedDrivers.set(rideId, drivers.map((d) => d._id.toString()));

          for (let i = 0; i < drivers.length; i++) {
            onNotifyDriver(drivers[i], i);
          }

          this.startExpiryTimer(rideId, rideExpirySeconds, onTimeout);
          return;
        }

        currentRadius += expansionStep;
        logger.info(`Expanding search radius to ${currentRadius}km for ride ${rideId}`);

        const expansionTimeout = setTimeout(() => {
          attemptSearch(expansion + 1).catch((err) => {
            logger.error(`Search expansion error for ride ${rideId}:`, err);
          });
        }, 3000);
        this.rideExpiryTimers.set(rideId + '_expansion', expansionTimeout);
      } catch (error) {
        logger.error(`Search attempt error for ride ${rideId}:`, error);
        this.cleanupRide(rideId);
        onTimeout();
      }
    };

    attemptSearch().catch((err) => {
      logger.error(`Initial search error for ride ${rideId}:`, err);
      this.cleanupRide(rideId);
      onTimeout();
    });
  }

  private startExpiryTimer(
    rideId: string,
    expirySeconds: number,
    onTimeout: () => void
  ): void {
    const prev = this.rideExpiryTimers.get(rideId);
    if (prev) clearTimeout(prev);

    const timer = setTimeout(() => {
      logger.info(`Ride request expired for ${rideId} after ${expirySeconds}s`);
      this.cleanupRide(rideId);
      onTimeout();
    }, expirySeconds * 1000);

    this.rideExpiryTimers.set(rideId, timer);
  }

  async acceptRide(
    driverId: string,
    rideId: string,
    onSuccess: (notifiedDriverIds: string[]) => void,
    onTaken: () => void
  ): Promise<void> {
    const key = `ride:${rideId}:accepted`;
    const accepted = await this.redis.setNX(key, driverId, 30);

    if (accepted) {
      const notifiedDrivers = this.rideNotifiedDrivers.get(rideId) || [];
      this.cleanupRide(rideId);
      onSuccess(notifiedDrivers);
    } else {
      onTaken();
    }
  }

  removeDriverFromNotified(rideId: string, driverId: string): void {
    const drivers = this.rideNotifiedDrivers.get(rideId);
    if (drivers) {
      const idx = drivers.indexOf(driverId);
      if (idx > -1) drivers.splice(idx, 1);
    }
  }

  private cleanupRide(rideId: string): void {
    const timer = this.rideExpiryTimers.get(rideId);
    if (timer) {
      clearTimeout(timer);
      this.rideExpiryTimers.delete(rideId);
    }
    const expTimer = this.rideExpiryTimers.get(rideId + '_expansion');
    if (expTimer) {
      clearTimeout(expTimer);
      this.rideExpiryTimers.delete(rideId + '_expansion');
    }
    this.rideNotifiedDrivers.delete(rideId);
  }

  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await Driver.findByIdAndUpdate(driverId, {
      'currentLocation.coordinates': [lng, lat],
      'currentLocation.updatedAt': new Date(),
    });

    await this.redis.geoAdd('drivers:locations', lng, lat, driverId);
  }
}
