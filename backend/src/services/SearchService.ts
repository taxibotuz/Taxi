import axios from 'axios';
import { logger } from '../config/logger';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

interface SearchResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
  street?: string;
  city?: string;
  district?: string;
}

export class SearchService {
  static async autocomplete(query: string, limit = 10): Promise<SearchResult[]> {
    try {
      const { data } = await axios.get(`${NOMINATIM_URL}/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit,
          countrycodes: 'uz',
          'accept-language': 'uz',
        },
        headers: { 'User-Agent': 'TaxiGo/1.0' },
      });

      return (data as any[]).map((item: any) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        type: item.type,
        street: item.address?.road || item.address?.pedestrian || '',
        city: item.address?.city || item.address?.town || '',
        district: item.address?.state_district || item.address?.county || '',
      }));
    } catch (error) {
      logger.error('Nominatim autocomplete error:', error);
      return [];
    }
  }

  static async reverseGeocode(lat: number, lng: number): Promise<SearchResult | null> {
    try {
      const { data } = await axios.get(`${NOMINATIM_URL}/reverse`, {
        params: {
          lat,
          lon: lng,
          format: 'json',
          addressdetails: 1,
          'accept-language': 'uz',
        },
        headers: { 'User-Agent': 'TaxiGo/1.0' },
      });

      return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        displayName: data.display_name,
        type: data.type,
        street: data.address?.road || data.address?.pedestrian || '',
        city: data.address?.city || data.address?.town || '',
        district: data.address?.state_district || data.address?.county || '',
      };
    } catch (error) {
      logger.error('Nominatim reverse geocode error:', error);
      return null;
    }
  }
}
