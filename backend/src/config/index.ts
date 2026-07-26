import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  buildVersion: '2.0.0',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taxigo',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webappUrl: process.env.TELEGRAM_WEBAPP_URL || '',
    adminIds: (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
    mode: (process.env.TELEGRAM_MODE || 'polling') as 'polling' | 'webhook',
    webhookDomain: process.env.TELEGRAM_WEBHOOK_DOMAIN || '',
    webhookPath: process.env.TELEGRAM_WEBHOOK_PATH || '/webhook/telegram',
  },

  payment: {
    click: {
      merchantId: process.env.CLICK_MERCHANT_ID || '',
      secretKey: process.env.CLICK_SECRET_KEY || '',
    },
    payme: {
      merchantId: process.env.PAYME_MERCHANT_ID || '',
      secretKey: process.env.PAYME_SECRET_KEY || '',
    },
  },

  map: {
    mapboxToken: process.env.MAPBOX_ACCESS_TOKEN || '',
    opencageKey: process.env.OPENCAGE_API_KEY || '',
  },

  district: {
    name: "To'rtko'l tumani",
    center: { lat: 41.55, lng: 61.00 },
    boundary: [
      { lat: 41.85, lng: 60.40 },
      { lat: 41.88, lng: 60.80 },
      { lat: 41.85, lng: 61.20 },
      { lat: 41.80, lng: 61.55 },
      { lat: 41.55, lng: 61.60 },
      { lat: 41.30, lng: 61.50 },
      { lat: 41.25, lng: 61.00 },
      { lat: 41.28, lng: 60.45 },
      { lat: 41.50, lng: 60.35 },
    ],
  },

  defaults: {
    searchRadius: parseInt(process.env.DEFAULT_SEARCH_RADIUS || '15', 10),
    searchTimeout: parseInt(process.env.DEFAULT_SEARCH_TIMEOUT || '15', 10),
    surgeMultiplier: parseFloat(process.env.SURGE_MULTIPLIER || '1.0'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
} as const;
