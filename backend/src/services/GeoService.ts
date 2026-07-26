import { config } from '../config';
import { logger } from '../config/logger';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export class GeoService {
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

    const inside = GeoService.isInsidePolygon(
      { lat, lng },
      config.district.boundary as unknown as GeoPoint[],
    );

    if (!inside) {
      return {
        valid: false,
        error: "TaxiGo hozircha faqat To'rtko'l tumani hududida ishlaydi.",
      };
    }

    return { valid: true };
  }

  static getDistrictConfig() {
    return config.district as unknown as {
      name: string;
      center: { lat: number; lng: number };
      boundary: GeoPoint[];
    };
  }
}
