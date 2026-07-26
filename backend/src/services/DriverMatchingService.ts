import mongoose from 'mongoose';
import { Driver, IDriver } from '../models/Driver';
import { Settings } from '../models/Settings';
import { RedisService } from './RedisService';
import { GeoService } from './GeoService';
import { logger } from '../config/logger';

export class DriverMatchingService {
  private static _instance: DriverMatchingService;
  private redis: RedisService;
  private searchTimeouts: Map<string, NodeJS.Timeout> = new Map();

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
  ): Promise<IDriver[]> {
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

    return drivers;
  }

  async startSearch(
    rideId: string,
    lat: number,
    lng: number,
    onFound: (driver: IDriver) => void,
    onTimeout: () => void,
    onNotifyDriver: (driver: IDriver) => void = () => {}
  ): Promise<void> {
    const settings = await Settings.findOne();
    const timeout = (settings?.search.searchTimeout || 15) * 1000;
    const maxExpansions = settings?.search.maxExpansions || 3;
    const expansionStep = settings?.search.expansionStep || 5;

    let currentRadius = settings?.search.maxRadius || 15;

    const attemptSearch = async (expansion: number = 0) => {
      if (expansion >= maxExpansions) {
        onTimeout();
        return;
      }

      try {
        const drivers = await this.findNearestDrivers(lat, lng, currentRadius);

        if (drivers.length > 0) {
          this.sendRideRequestToDrivers(drivers, rideId, onFound, onNotifyDriver);
          return;
        }

        currentRadius += expansionStep;
        logger.info(`Expanding search radius to ${currentRadius}km for ride ${rideId}`);

        const prevTimeout = this.searchTimeouts.get(rideId);
        if (prevTimeout) clearTimeout(prevTimeout);

        const expansionTimeout = setTimeout(() => {
          attemptSearch(expansion + 1).catch((err) => {
            logger.error(`Search expansion error for ride ${rideId}:`, err);
          });
        }, timeout);
        this.searchTimeouts.set(rideId, expansionTimeout);
      } catch (error) {
        logger.error(`Search attempt error for ride ${rideId}:`, error);
        onTimeout();
      }
    };

    attemptSearch().catch((err) => {
      logger.error(`Initial search error for ride ${rideId}:`, err);
    });
  }

  private sendRideRequestToDrivers(
    drivers: IDriver[],
    rideId: string,
    onFound: (driver: IDriver) => void,
    onNotifyDriver: (driver: IDriver) => void
  ): void {
    const prevTimeout = this.searchTimeouts.get(rideId);
    if (prevTimeout) clearTimeout(prevTimeout);

    const timeout = setTimeout(() => {
      logger.info(`Ride request timeout for ${rideId}`);
      this.searchTimeouts.delete(rideId);
    }, 15000);

    this.searchTimeouts.set(rideId, timeout);

    for (const driver of drivers) {
      onNotifyDriver(driver);
    }
  }

  async acceptRide(driverId: string, rideId: string, onSuccess: () => void, onTaken: () => void): Promise<void> {
    const key = `ride:${rideId}:accepted`;
    const accepted = await this.redis.setNX(key, driverId, 15);

    if (accepted) {
      const t = this.searchTimeouts.get(rideId);
      if (t) clearTimeout(t);
      this.searchTimeouts.delete(rideId);
      onSuccess();
    } else {
      onTaken();
    }
  }

  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await Driver.findByIdAndUpdate(driverId, {
      'currentLocation.coordinates': [lng, lat],
      'currentLocation.updatedAt': new Date(),
    });

    await this.redis.geoAdd('drivers:locations', lng, lat, driverId);
  }
}
