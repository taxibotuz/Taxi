import { config } from '../config';
import { Settings } from '../models/Settings';

export interface GeoPoint {
  lat: number;
  lng: number;
}

let cachedBoundary: GeoPoint[] | null = null;

export class GeoService {
  static async loadBoundary(): Promise<GeoPoint[]> {
    try {
      const settings = await Settings.findOne().lean();
      if (settings?.district?.boundary?.length) {
        cachedBoundary = settings.district.boundary as GeoPoint[];
        return cachedBoundary;
      }
    } catch {
      // fall through
    }
    cachedBoundary = null;
    return GeoService.getDefaultBoundary();
  }

  static async reloadBoundary(): Promise<void> {
    cachedBoundary = null;
    await GeoService.loadBoundary();
  }

  static getBoundary(): GeoPoint[] {
    if (cachedBoundary) return cachedBoundary;
    return GeoService.getDefaultBoundary();
  }

  private static getDefaultBoundary(): GeoPoint[] {
    return config.district.boundary as unknown as GeoPoint[];
  }

  static isInsidePolygon(point: GeoPoint, polygon: GeoPoint[] | readonly GeoPoint[]): boolean {
    let inside = false;
    const { lat, lng } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng;
      const yi = polygon[i].lat;
      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect = ((yi > lat) !== (yj > lat))
        && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  static validateLocation(
    lat: number,
    lng: number,
  ): { valid: true } | { valid: false; error: string } {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { valid: false, error: 'Invalid coordinates' };
    }

    const polygon = GeoService.getBoundary();
    const inside = GeoService.isInsidePolygon({ lat, lng }, polygon);

    if (!inside) {
      return {
        valid: false,
        error: "TaxiGo hozircha faqat To'rtko'l tumani hududida ishlaydi.",
      };
    }

    return { valid: true };
  }

  static getDistrictConfig() {
    return {
      name: config.district.name,
      center: config.district.center,
      boundary: GeoService.getBoundary(),
    };
  }
}