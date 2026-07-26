import axios from 'axios';
import { logger } from '../config/logger';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

const BOUNDS = {
  minLat: 41.2,
  maxLat: 41.8,
  minLng: 60.5,
  maxLng: 61.5,
};

const COUNTRY_KEYWORDS = [
  'ozbekiston', 'zbekiston', 'uzbekistan',
  'узбекистан', 'збекистан',
];

const REGION_KEYWORDS = [
  'xorazm', 'xorezm', 'khorezm',
  'хорезм',
];

const DISTRICT_KEYWORDS = [
  "to'rtko'l", "to‘rtko‘l", 'tortkol', 'turtkul',
  'турткуль',
];

const CACHE_TTL_MS = 3600_000;

const cache = new Map<string, { allowed: boolean; cachedAt: number }>();

interface AddressInfo {
  country?: string;
  state?: string;
  region?: string;
  county?: string;
  city_district?: string;
  state_district?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  suburb?: string;
}

export class ServiceAreaService {
  static async validate(
    lat: number,
    lng: number,
  ): Promise<{ allowed: true } | { allowed: false; message: string }> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.allowed
        ? { allowed: true }
        : { allowed: false, message: ServiceAreaService.errorMessage('uz') };
    }

    if (!ServiceAreaService.isWithinBoundingBox(lat, lng)) {
      cache.set(key, { allowed: false, cachedAt: Date.now() });
      return { allowed: false, message: ServiceAreaService.errorMessage('uz') };
    }

    try {
      const address = await ServiceAreaService.reverseGeocode(lat, lng);

      if (!ServiceAreaService.isInServiceArea(address)) {
        cache.set(key, { allowed: false, cachedAt: Date.now() });
        return { allowed: false, message: ServiceAreaService.errorMessage('uz') };
      }

      cache.set(key, { allowed: true, cachedAt: Date.now() });
      return { allowed: true };
    } catch (error) {
      logger.error('ServiceAreaService geocode error, allowing request:', error);
      return { allowed: true };
    }
  }

  static errorMessage(lang: string): string {
    return lang === 'ru'
      ? '❌ TaxiGo пока работает только в Тўрткульском районе Хорезмской области.'
      : "❌ TaxiGo hozircha faqat Xorazm viloyati, To'rtko'l tumani hududida xizmat ko'rsatadi.";
  }

  private static isWithinBoundingBox(lat: number, lng: number): boolean {
    return (
      lat >= BOUNDS.minLat &&
      lat <= BOUNDS.maxLat &&
      lng >= BOUNDS.minLng &&
      lng <= BOUNDS.maxLng
    );
  }

  private static async reverseGeocode(lat: number, lng: number): Promise<AddressInfo> {
    const { data } = await axios.get(NOMINATIM_URL, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1,
        'accept-language': 'uz',
      },
      headers: {
        'User-Agent': 'TaxiGo/1.0 (ride-service; https://github.com/taxibotuz/Taxi)',
      },
      timeout: 5000,
    });

    return (data && data.address) || {};
  }

  private static isInServiceArea(addr: AddressInfo): boolean {
    const fields = [
      addr.country,
      addr.state,
      addr.region,
      addr.county,
      addr.city_district,
      addr.state_district,
      addr.city,
      addr.town,
      addr.village,
      addr.municipality,
      addr.suburb,
    ].filter(Boolean) as string[];

    const all = fields.map((s) => s.toLowerCase());

    const inCountry = COUNTRY_KEYWORDS.some((kw) =>
      all.some((f) => f.includes(kw)),
    );
    if (!inCountry) return false;

    const inRegion = REGION_KEYWORDS.some((kw) =>
      all.some((f) => f.includes(kw)),
    );
    if (!inRegion) return false;

    const inDistrict = DISTRICT_KEYWORDS.some((kw) =>
      all.some((f) => f.includes(kw)),
    );
    if (!inDistrict) return false;

    return true;
  }
}
