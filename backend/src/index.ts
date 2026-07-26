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

import authRoutes from './routes/auth';
import rideRoutes from './routes/rides';
import driverRoutes from './routes/drivers';
import walletRoutes from './routes/wallet';
import reviewRoutes from './routes/reviews';
import promoRoutes from './routes/promocodes';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import foodRoutes from './routes/food';

const app = express();
const server = http.createServer(app);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/promocodes', promoRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/food', foodRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    appName: 'TaxiGo',
    version: '1.0.0',
    features: {
      foodDelivery: false,
      rideScheduling: false,
      referralSystem: false,
    },
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

SocketService.initialize(server);

const bot = new TelegramBot();

async function start() {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('MongoDB connected');

    server.listen(config.port, config.host, () => {
      logger.info(`Server running on http://${config.host}:${config.port}`);
      logger.info(`Environment: ${config.env}`);
    });

    await bot.launch();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server };
