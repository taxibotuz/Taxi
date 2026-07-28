import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { GeoService } from '../services/GeoService';

export function validateDistrict(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const { pickupLat, pickupLng, destLat, destLng } = req.body;

  if (pickupLat !== undefined && pickupLng !== undefined) {
    const pickupCheck = GeoService.validatePickupLocation(pickupLat, pickupLng);
    if (!pickupCheck.valid) {
      return res.status(403).json({
        success: false,
        error: pickupCheck.error,
        field: pickupCheck.field,
      });
    }
  }

  if (destLat !== undefined && destLng !== undefined) {
    const destCheck = GeoService.validateDestinationLocation(destLat, destLng);
    if (!destCheck.valid) {
      return res.status(403).json({
        success: false,
        error: destCheck.error,
        field: destCheck.field,
      });
    }
  }

  next();
}
