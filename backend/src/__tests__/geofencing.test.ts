import { GeoService, GeoPoint } from '../services/GeoService';

const TORTKOL_BOUNDARY: GeoPoint[] = [
  { lat: 41.85, lng: 60.40 },
  { lat: 41.88, lng: 60.80 },
  { lat: 41.85, lng: 61.20 },
  { lat: 41.80, lng: 61.55 },
  { lat: 41.55, lng: 61.60 },
  { lat: 41.30, lng: 61.50 },
  { lat: 41.25, lng: 61.00 },
  { lat: 41.28, lng: 60.45 },
  { lat: 41.50, lng: 60.35 },
];

describe('GeoService.isInsidePolygon', () => {
  it('point inside polygon → true', () => {
    const center: GeoPoint = { lat: 41.55, lng: 61.00 };
    expect(GeoService.isInsidePolygon(center, TORTKOL_BOUNDARY)).toBe(true);
  });

  it('point outside polygon (far east) → false', () => {
    const outside: GeoPoint = { lat: 41.55, lng: 63.00 };
    expect(GeoService.isInsidePolygon(outside, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('point outside polygon (far west) → false', () => {
    const outside: GeoPoint = { lat: 41.55, lng: 58.00 };
    expect(GeoService.isInsidePolygon(outside, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('point outside polygon (far north) → false', () => {
    const outside: GeoPoint = { lat: 43.00, lng: 61.00 };
    expect(GeoService.isInsidePolygon(outside, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('point outside polygon (far south) → false', () => {
    const outside: GeoPoint = { lat: 40.00, lng: 61.00 };
    expect(GeoService.isInsidePolygon(outside, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('point on polygon edge → depends on ray-casting', () => {
    const edgePoint: GeoPoint = { lat: 41.85, lng: 60.80 };
    const result = GeoService.isInsidePolygon(edgePoint, TORTKOL_BOUNDARY);
    expect(typeof result).toBe('boolean');
  });

  it('point just inside northern boundary → true', () => {
    const point: GeoPoint = { lat: 41.87, lng: 60.80 };
    expect(GeoService.isInsidePolygon(point, TORTKOL_BOUNDARY)).toBe(true);
  });

  it('point just outside northern boundary → false', () => {
    const point: GeoPoint = { lat: 41.90, lng: 60.80 };
    expect(GeoService.isInsidePolygon(point, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('point just inside southern boundary → true', () => {
    const point: GeoPoint = { lat: 41.26, lng: 61.00 };
    expect(GeoService.isInsidePolygon(point, TORTKOL_BOUNDARY)).toBe(true);
  });

  it('point just outside southern boundary → false', () => {
    const point: GeoPoint = { lat: 41.23, lng: 61.00 };
    expect(GeoService.isInsidePolygon(point, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('Tashkent (far away) → false', () => {
    const tashkent: GeoPoint = { lat: 41.30, lng: 69.28 };
    expect(GeoService.isInsidePolygon(tashkent, TORTKOL_BOUNDARY)).toBe(false);
  });

  it('Bukhara (far away) → false', () => {
    const bukhara: GeoPoint = { lat: 39.77, lng: 64.42 };
    expect(GeoService.isInsidePolygon(bukhara, TORTKOL_BOUNDARY)).toBe(false);
  });
});

describe('GeoService.validatePickupLocation', () => {
  it('pickup inside district → valid', () => {
    const result = GeoService.validatePickupLocation(41.55, 61.00);
    expect(result.valid).toBe(true);
  });

  it('pickup outside district → invalid with field=pickup', () => {
    const result = GeoService.validatePickupLocation(43.00, 69.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('pickup');
      expect(result.error).toContain('TaxiGo');
    }
  });

  it('invalid coordinates → invalid', () => {
    const result = GeoService.validatePickupLocation(999, 999);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Invalid coordinates');
    }
  });
});

describe('GeoService.validateDestinationLocation', () => {
  it('destination inside district → valid', () => {
    const result = GeoService.validateDestinationLocation(41.55, 61.00);
    expect(result.valid).toBe(true);
  });

  it('destination outside district → invalid with field=destination', () => {
    const result = GeoService.validateDestinationLocation(43.00, 69.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('destination');
      expect(result.error).toContain('manzil');
    }
  });

  it('invalid coordinates → invalid', () => {
    const result = GeoService.validateDestinationLocation(-100, 200);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('Invalid coordinates');
    }
  });
});

describe('GeoService.getBoundary', () => {
  it('returns boundary array with at least 3 points', () => {
    const boundary = GeoService.getBoundary();
    expect(boundary.length).toBeGreaterThanOrEqual(3);
  });

  it('each point has lat and lng', () => {
    const boundary = GeoService.getBoundary();
    for (const point of boundary) {
      expect(typeof point.lat).toBe('number');
      expect(typeof point.lng).toBe('number');
    }
  });
});

describe('GeoService.getDistrictConfig', () => {
  it('returns name, center, and boundary', () => {
    const config = GeoService.getDistrictConfig();
    expect(config.name).toBeTruthy();
    expect(config.center).toBeDefined();
    expect(config.center.lat).toBeDefined();
    expect(config.center.lng).toBeDefined();
    expect(config.boundary.length).toBeGreaterThanOrEqual(3);
  });
});
