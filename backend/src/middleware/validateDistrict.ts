import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { GeoService } from '../services/GeoService';
import { logger } from '../config/logger';

export function validateDistrict(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const { pickupLat, pickupLng, destLat, destLng } = req.body;

  if (pickupLat !== undefined && pickupLng !== undefined) {
    const pickupCheck = GeoService.validateLocation(pickupLat, pickupLng);
    if (!pickupCheck.valid) {
      return res.status(400).json({ error: pickupCheck.error });
    }
  }

  if (destLat !== undefined && destLng !== undefined) {
    const destCheck = GeoService.validateLocation(destLat, destLng);
    if (!destCheck.valid) {
      return res.status(400).json({ error: destCheck.error });
    }
  }

  next();
}
