import { Router, Request, Response } from 'express';
import { Settings } from '../models/Settings';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne().lean();
    if (!settings) {
      return res.json({
        district: {
          enabled: true,
          boundary: [],
        },
        pricing: {},
        features: {},
        maintenance: { enabled: false },
      });
    }
    return res.json({
      district: settings.district,
      pricing: settings.pricing,
      features: settings.features,
      maintenance: settings.maintenance,
      general: {
        contactPhone: settings.general?.contactPhone,
        supportUrl: settings.general?.supportUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get settings' });
  }
});

export default router;
