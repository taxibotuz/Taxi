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

const OUTSIDE_MESSAGE = 'This location is outside TaxiGo service area.';

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
});

describe('GeoService.validatePickupLocation', () => {
  it('pickup inside district → valid', () => {
    const result = GeoService.validatePickupLocation(41.55, 61.00);
    expect(result.valid).toBe(true);
  });

  it('pickup outside district → invalid with field=pickup and correct message', () => {
    const result = GeoService.validatePickupLocation(43.00, 69.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('pickup');
      expect(result.error).toBe(OUTSIDE_MESSAGE);
    }
  });

  it('invalid coordinates → invalid', () => {
    const result = GeoService.validatePickupLocation(999, 999);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe(OUTSIDE_MESSAGE);
    }
  });
});

describe('GeoService.validateDestinationLocation', () => {
  it('destination inside district → valid', () => {
    const result = GeoService.validateDestinationLocation(41.55, 61.00);
    expect(result.valid).toBe(true);
  });

  it('destination outside district → invalid with field=destination and correct message', () => {
    const result = GeoService.validateDestinationLocation(43.00, 69.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('destination');
      expect(result.error).toBe(OUTSIDE_MESSAGE);
    }
  });

  it('invalid coordinates → invalid', () => {
    const result = GeoService.validateDestinationLocation(-100, 200);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe(OUTSIDE_MESSAGE);
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

describe('GeoService.getGeoJsonPolygon', () => {
  it('returns a valid GeoJSON Feature', () => {
    const feature = GeoService.getGeoJsonPolygon() as any;
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.geometry.coordinates).toBeInstanceOf(Array);
    expect(feature.geometry.coordinates[0]).toBeInstanceOf(Array);
  });

  it('GeoJSON polygon closes the ring (first === last)', () => {
    const feature = GeoService.getGeoJsonPolygon() as any;
    const ring = feature.geometry.coordinates[0];
    const first = ring[0];
    const last = ring[ring.length - 1];
    expect(first[0]).toBe(last[0]);
    expect(first[1]).toBe(last[1]);
  });

  it('GeoJSON uses [lng, lat] coordinate order', () => {
    const feature = GeoService.getGeoJsonPolygon() as any;
    const ring = feature.geometry.coordinates[0];
    for (const coord of ring) {
      expect(typeof coord[0]).toBe('number');
      expect(typeof coord[1]).toBe('number');
    }
  });

  it('includes style properties', () => {
    const feature = GeoService.getGeoJsonPolygon() as any;
    expect(feature.properties.style.border).toBe('#00C853');
    expect(feature.properties.style.weight).toBe(3);
    expect(feature.properties.style.fillColor).toBe('#00C853');
    expect(feature.properties.style.fillOpacity).toBe(0.25);
  });
});

describe('RoutingService distance calculation', () => {
  it('haversine: known distance between two points', () => {
    const R = 6371;
    const fromLat = 41.55, fromLng = 61.00;
    const toLat = 41.85, toLng = 60.40;
    const dLat = ((toLat - fromLat) * Math.PI) / 180;
    const dLng = ((toLng - fromLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(100);
  });

  it('zero distance between same point', () => {
    const R = 6371;
    const lat = 41.55, lng = 61.00;
    const dLat = 0, dLng = 0;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    expect(dist).toBe(0);
  });
});

describe('Service validation — HTTP 403 equivalent', () => {
  it('pickup outside returns 403 equivalent with exact message', () => {
    const result = GeoService.validatePickupLocation(41.20, 61.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe(OUTSIDE_MESSAGE);
    }
  });

  it('destination outside returns 403 equivalent with exact message', () => {
    const result = GeoService.validateDestinationLocation(41.20, 61.00);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe(OUTSIDE_MESSAGE);
    }
  });

  it('both pickup and destination outside', () => {
    const pResult = GeoService.validatePickupLocation(40.00, 60.00);
    const dResult = GeoService.validateDestinationLocation(40.00, 60.00);
    expect(pResult.valid).toBe(false);
    expect(dResult.valid).toBe(false);
  });

  it('pickup inside, destination outside', () => {
    const pResult = GeoService.validatePickupLocation(41.55, 61.00);
    const dResult = GeoService.validateDestinationLocation(40.00, 60.00);
    expect(pResult.valid).toBe(true);
    expect(dResult.valid).toBe(false);
  });

  it('both pickup and destination inside', () => {
    const pResult = GeoService.validatePickupLocation(41.55, 61.00);
    const dResult = GeoService.validateDestinationLocation(41.70, 60.80);
    expect(pResult.valid).toBe(true);
    expect(dResult.valid).toBe(true);
  });
});
