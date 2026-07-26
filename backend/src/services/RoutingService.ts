import { logger } from '../config/logger';

const OSRM_BASE = 'http://router.project-osrm.org';

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
}

export class RoutingService {
  static async getRoute(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number
  ): Promise<RouteResult> {
    try {
      const url = `${OSRM_BASE}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
      const data = await res.json() as any;

      if (data.code !== 'Ok' || !data.routes?.length) {
        throw new Error('OSRM no route found');
      }

      const route = data.routes[0];
      return {
        distanceKm: Math.round(route.distance / 100) / 10,
        durationMin: Math.round(route.duration / 60),
      };
    } catch (error) {
      logger.warn('OSRM routing failed, using Haversine fallback:', error);
      return RoutingService.haversineFallback(fromLng, fromLat, toLng, toLat);
    }
  }

  static async getRoutesBatch(
    drivers: Array<{ lng: number; lat: number }>,
    toLng: number,
    toLat: number
  ): Promise<RouteResult[]> {
    const promises = drivers.map((d) =>
      RoutingService.getRoute(d.lng, d.lat, toLng, toLat)
    );
    return Promise.all(promises);
  }

  private static haversineFallback(
    fromLng: number,
    fromLat: number,
    toLng: number,
    toLat: number
  ): RouteResult {
    const R = 6371;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((fromLat * Math.PI) / 180) *
        Math.cos((toLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return {
      distanceKm: Math.round(dist * 10) / 10,
      durationMin: Math.round(dist * 3),
    };
  }
}
