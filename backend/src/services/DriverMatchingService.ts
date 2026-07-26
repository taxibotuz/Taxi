import mongoose from 'mongoose';
import { Driver, IDriver } from '../models/Driver';
import { Settings } from '../models/Settings';
import { RedisService } from './RedisService';
import { logger } from '../config/logger';

export class DriverMatchingService {
  private redis: RedisService;
  private searchTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.redis = new RedisService();
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

    const drivers = await Driver.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: maxRadius * 1000,
          spherical: true,
        },
      },
      {
        $match: {
          status: 'online',
          isOnline: true,
          isAvailable: true,
          isApproved: true,
          isSuspended: false,
          isBlacklisted: false,
        },
      },
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
    onTimeout: () => void
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

      const drivers = await this.findNearestDrivers(lat, lng, currentRadius);

      if (drivers.length > 0) {
        this.sendRideRequestToDrivers(drivers, rideId, onFound);
        return;
      }

      currentRadius += expansionStep;
      logger.info(`Expanding search radius to ${currentRadius}km for ride ${rideId}`);

      setTimeout(() => attemptSearch(expansion + 1), timeout);
    };

    attemptSearch();
  }

  private sendRideRequestToDrivers(
    drivers: IDriver[],
    rideId: string,
    onFound: (driver: IDriver) => void
  ): void {
    const timeout = setTimeout(() => {
      logger.info(`Ride request timeout for ${rideId}`);
      this.searchTimeouts.delete(rideId);
    }, 15000);

    this.searchTimeouts.set(rideId, timeout);

    for (const driver of drivers) {
      this.redis.publish('ride:request', {
        rideId,
        driverId: driver._id.toString(),
      });
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
