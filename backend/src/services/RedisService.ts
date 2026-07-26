import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../config/logger';
import { ErrorReporter } from './ErrorReporter';

export class RedisService {
  private static _instance: RedisService;
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;
  private connected: boolean = false;

  private constructor() {
    this.client = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.pubClient = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: null });
    this.subClient = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: null });

    this.client.on('error', (err) => { logger.error('Redis client error:', err); ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'redis', metadata: { client: 'main' } }); });
    this.pubClient.on('error', (err) => { logger.error('Redis pubClient error:', err); ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'redis', metadata: { client: 'pub' } }); });
    this.subClient.on('error', (err) => { logger.error('Redis subClient error:', err); ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'redis', metadata: { client: 'sub' } }); });
  }

  static getInstance(): RedisService {
    if (!RedisService._instance) {
      RedisService._instance = new RedisService();
    }
    return RedisService._instance;
  }

  static isConnected(): boolean {
    if (!RedisService._instance) return false;
    return RedisService._instance.connected;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await Promise.all([
      this.client.connect(),
      this.pubClient.connect(),
      this.subClient.connect(),
    ]);
    this.connected = true;
    logger.info('Redis connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await Promise.all([
      this.client.quit(),
      this.pubClient.quit(),
      this.subClient.quit(),
    ]);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.client.set(key, value, 'EX', ttl);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async setNX(key: string, value: string, ttl?: number): Promise<boolean> {
    const result = await this.client.setnx(key, value);
    if (result && ttl) {
      await this.client.expire(key, ttl);
    }
    return result === 1;
  }

  async geoAdd(key: string, lng: number, lat: number, member: string): Promise<number> {
    return this.client.geoadd(key, lng, lat, member);
  }

  async geoRadius(key: string, lng: number, lat: number, radius: number, unit: 'km' | 'm' = 'km'): Promise<string[]> {
    const result = await this.client.georadius(key, lng, lat, radius, unit);
    return result as string[];
  }

  async publish(channel: string, message: any): Promise<number> {
    return this.pubClient.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subClient.subscribe(channel);
    this.subClient.on('message', (ch, msg) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(msg));
        } catch {
          callback(msg);
        }
      }
    });
  }

  async cacheSet(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    if (data) {
      return JSON.parse(data) as T;
    }
    return null;
  }

  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.client.expire(key, ttl);
  }
}
