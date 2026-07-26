import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { logger } from './config/logger';
import { SocketService } from './sockets/SocketService';
import { TelegramBot } from './bot';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ErrorReporter } from './services/ErrorReporter';
import { RedisService } from './services/RedisService';
import { Settings } from './models/Settings';

import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';
import driverRoutes from './routes/drivers';
import walletRoutes from './routes/wallet';
import reviewRoutes from './routes/reviews';
import promoRoutes from './routes/promocodes';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import errorRoutes from './routes/errors';
import foodRoutes from './routes/food';

ErrorReporter.init();

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
  const err = reason instanceof Error ? reason : new Error(String(reason));
  ErrorReporter.report(err, { type: 'unhandled_rejection' });
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  ErrorReporter.report(err, { type: 'uncaught_exception' });
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://telegram.org', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://telegram.org', 'https://unpkg.com'],
      connectSrc: ["'self'", 'ws:', 'wss:', 'https://*.tile.openstreetmap.org'],
      frameSrc: ["'self'", 'https://telegram.org'],
      fontSrc: ["'self'", 'data:'],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      manifestSrc: ["'self'"],
    },
  },
}));
app.use(compression());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', limiter);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/promocodes', promoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/food', foodRoutes);

app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: mongoState === 1 ? 'connected' : mongoStatus[mongoState] || 'unknown',
    redis: RedisService.isConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: mongoState === 1 ? 'connected' : mongoStatus[mongoState] || 'unknown',
    redis: RedisService.isConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/readiness', async (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const isReady = mongoState === 1;
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not ready',
    mongodb: mongoState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/liveness', (_req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/config', async (_req, res) => {
  const settings = await Settings.findOne().lean();
  res.json({
    appName: 'TaxiGo',
    version: '1.0.0',
    features: {
      foodDelivery: settings?.features?.foodDelivery || false,
      rideScheduling: settings?.features?.rideScheduling || false,
      referralSystem: settings?.features?.referralSystem || false,
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

SocketService.initialize(server);

const bot = new TelegramBot();
bot.setApp(app);

function validateEnv(): void {
  const required: [string, string][] = [
    ['MONGODB_URI', config.mongodb.uri],
    ['JWT_SECRET', config.jwt.secret],
    ['TELEGRAM_BOT_TOKEN', config.telegram.botToken],
    ['REDIS_URL', config.redis.url],
    ['FRONTEND_URL', config.frontendUrl],
  ];

  const missing = required.filter(([_, val]) => !val);
  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(', ');
    logger.error(`Missing required environment variables: ${names}`);
    throw new Error(`Server cannot start: missing required environment variables: ${names}`);
  }
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
  ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'mongodb' });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    SocketService.close();
    logger.info('Socket.io closed');
  } catch (err) {
    logger.error('Socket.io close error:', err);
  }

  server.close(async () => {
    logger.info('HTTP server closed');
    try {
      await bot.stop(signal);
      logger.info('Telegram bot stopped');
    } catch (err) {
      logger.error('Bot stop error:', err);
    }
    try {
      await RedisService.getInstance().disconnect();
      logger.info('Redis disconnected');
    } catch (err) {
      logger.error('Redis disconnect error:', err);
    }
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    } catch (err) {
      logger.error('MongoDB disconnect error:', err);
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

async function start() {
  try {
    validateEnv();

    await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info('MongoDB connected');

    server.listen(config.port, config.host, () => {
      logger.info(`Server running on http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    await RedisService.getInstance().connect();
    await bot.launch();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server };