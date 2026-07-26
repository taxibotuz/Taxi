import { Driver } from '../models/Driver';
import { RedisService } from './RedisService';
import { logger } from '../config/logger';

interface PendingUpdate {
  driverId: string;
  lng: number;
  lat: number;
  timestamp: Date;
}

export class LocationBatcher {
  private static _instance: LocationBatcher;
  private pending: Map<string, PendingUpdate> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private redis: RedisService;
  private readonly FLUSH_INTERVAL_MS = 30000;
  private readonly STALE_THRESHOLD_MS = 30000;
  private lastUpdate: Map<string, number> = new Map();

  private constructor() {
    this.redis = RedisService.getInstance();
    this.startFlushLoop();
  }

  static getInstance(): LocationBatcher {
    if (!LocationBatcher._instance) {
      LocationBatcher._instance = new LocationBatcher();
    }
    return LocationBatcher._instance;
  }

  queueUpdate(driverId: string, lng: number, lat: number): void {
    this.pending.set(driverId, {
      driverId,
      lng,
      lat,
      timestamp: new Date(),
    });

    this.lastUpdate.set(driverId, Date.now());

    this.redis.geoAdd('drivers:locations', lng, lat, driverId).catch(() => {});
    this.redis.set(`driver:${driverId}:loc`, JSON.stringify({ lng, lat, t: Date.now() }), 60).catch(() => {});
  }

  isStale(driverId: string): boolean {
    const last = this.lastUpdate.get(driverId);
    if (!last) return true;
    return Date.now() - last > this.STALE_THRESHOLD_MS;
  }

  getLastUpdate(driverId: string): number {
    return this.lastUpdate.get(driverId) || 0;
  }

  private startFlushLoop(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        logger.error('Location batch flush error:', err);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  private async flush(): Promise<void> {
    if (this.pending.size === 0) return;

    const updates = Array.from(this.pending.values());
    this.pending.clear();

    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u.driverId },
        update: {
          $set: {
            'currentLocation.coordinates': [u.lng, u.lat],
            'currentLocation.updatedAt': u.timestamp,
          },
        },
      },
    }));

    try {
      await Driver.bulkWrite(bulkOps, { ordered: false });
      logger.debug(`Flushed ${updates.length} driver locations to MongoDB`);
    } catch (error) {
      logger.error('MongoDB location flush error:', error);
    }
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush().catch(() => {});
  }
}
