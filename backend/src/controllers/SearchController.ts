import { Request, Response } from 'express';
import { SearchService } from '../services/SearchService';
import { logger } from '../config/logger';

export class SearchController {
  async autocomplete(req: Request, res: Response) {
    try {
      const q = req.query.q as string;
      if (!q || q.trim().length < 2) {
        return res.json({ results: [] });
      }
      const results = await SearchService.autocomplete(q.trim());
      return res.json({ results });
    } catch (error) {
      logger.error('Autocomplete error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  async reverseGeocode(req: Request, res: Response) {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }
      const result = await SearchService.reverseGeocode(lat, lng);
      return res.json({ result });
    } catch (error) {
      logger.error('Reverse geocode error:', error);
      return res.status(500).json({ error: 'Reverse geocode failed' });
    }
  }
}
