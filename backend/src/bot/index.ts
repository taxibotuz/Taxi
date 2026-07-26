import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import { config } from '../config';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { Settings } from '../models/Settings';
import { UserRole, RideStatus, DriverStatus } from '../types';
import { DriverMatchingService } from '../services/DriverMatchingService';
import { SocketService } from '../sockets/SocketService';
import { logger } from '../config/logger';

export class TelegramBot {
  private static _instance: TelegramBot;
  private bot: Telegraf;
  private launched: boolean = false;
  private app: express.Application | null = null;

  constructor() {
    TelegramBot._instance = this;
    this.bot = new Telegraf(config.telegram.botToken);

    this.setupCommands();
    this.setupActions();
    this.setupHears();
  }

  static getInstance(): TelegramBot {
    return TelegramBot._instance;
  }

  setApp(app: express.Application): void {
    this.app = app;
  }

  private setupCommands() {
    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id;
      let user = await User.findOne({ telegramId });

      if (!user) {
        user = await User.create({
          telegramId,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          username: ctx.from.username,
          role: UserRole.CUSTOMER,
        });
      }

      const isAdmin = config.telegram.adminIds.includes(telegramId);
      const isDriver = user.role === UserRole.DRIVER;

      const buttonRows: any[] = [
        [Markup.button.webApp('Open TaxiGo', config.telegram.webappUrl)],
      ];

      if (isDriver) {
        buttonRows.unshift([
          Markup.button.callback('Online', 'toggle_online'),
          Markup.button.callback('Status', 'driver_status'),
        ]);
      }

      if (isAdmin) {
        buttonRows.push([
          Markup.button.webApp('Admin Panel', `${config.telegram.webappUrl}/admin`),
        ]);
      }

      await ctx.reply(
        `Welcome to TaxiGo, ${ctx.from.first_name}! 🚀\n\n` +
        `Order taxis, track rides, and more.\n` +
        `Use the buttons below to get started.`,
        Markup.inlineKeyboard(buttonRows)
      );
    });

    this.bot.command('status', async (ctx) => {
      const driver = await Driver.findOne({ userId: ctx.from.id as any }).populate('userId', 'firstName');
      if (!driver) {
        return ctx.reply('You are not registered as a driver.');
      }

      await ctx.reply(
        `📊 Driver Status\n\n` +
        `Status: ${driver.isOnline ? '🟢 Online' : '🔴 Offline'}\n` +
        `Rating: ⭐ ${driver.rating}\n` +
        `Rides: ${driver.totalRides}\n` +
        `Earnings: ${driver.totalEarnings.toLocaleString()} sum\n` +
        `Car: ${driver.car.brand} ${driver.car.model} (${driver.car.color})\n` +
        `Plate: ${driver.car.plateNumber}`
      );
    });

    this.bot.command('online', async (ctx) => {
      await this.toggleOnline(ctx);
    });

    this.bot.command('offline', async (ctx) => {
      const driver = await Driver.findOneAndUpdate(
        { userId: ctx.from.id as any },
        { isOnline: false, status: DriverStatus.OFFLINE }
      );
      await ctx.reply('🔴 You are now offline');
    });

    this.bot.command('history', async (ctx) => {
      const driver = await Driver.findOne({ userId: ctx.from.id as any });
      if (!driver) return ctx.reply('Not a driver');

      const orders = await Order.find({ driverId: driver._id })
        .sort({ createdAt: -1 })
        .limit(5);

      if (orders.length === 0) {
        return ctx.reply('No ride history');
      }

      let msg = '📋 Recent Rides:\n\n';
      orders.forEach((o, i) => {
        msg += `${i + 1}. ${o.pickup.address.slice(0, 30)} → ${o.destination.address.slice(0, 30)}\n`;
        msg += `   Status: ${o.status} | Total: ${o.pricing.total.toLocaleString()} sum\n\n`;
      });

      await ctx.reply(msg);
    });

    this.bot.command('balance', async (ctx) => {
      const driver = await Driver.findOne({ userId: ctx.from.id as any });
      if (!driver) return ctx.reply('Not a driver');

      await ctx.reply(
        `💰 Balance Summary\n\n` +
        `Today: ${driver.todayEarnings.toLocaleString()} sum\n` +
        `Weekly: ${driver.weeklyEarnings.toLocaleString()} sum\n` +
        `Monthly: ${driver.monthlyEarnings.toLocaleString()} sum\n` +
        `Total: ${driver.totalEarnings.toLocaleString()} sum`
      );
    });

    this.bot.command('support', async (ctx) => {
      await ctx.reply(
        '📞 Support\n\n' +
        'Contact us:\n' +
        'Phone: +998781234567\n' +
        'Telegram: @taxigo_support'
      );
    });

    this.bot.command('admin', async (ctx) => {
      if (!config.telegram.adminIds.includes(ctx.from.id)) {
        return ctx.reply('Unauthorized');
      }
      await ctx.reply(
        '🔐 Admin Panel',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
          [Markup.button.callback('📊 Dashboard', 'admin_dashboard')],
          [Markup.button.callback('👥 Drivers', 'admin_drivers')],
          [Markup.button.callback('📦 Orders', 'admin_orders')],
          [Markup.button.callback('⚙ Settings', 'admin_settings')],
          [Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
        ])
      );
    });
  }

  private setupActions() {
    this.bot.action('toggle_online', async (ctx) => {
      await this.toggleOnline(ctx);
    });

    this.bot.action('driver_status', async (ctx) => {
      const driver = await Driver.findOne({ userId: ctx.from.id as any });
      if (!driver) return ctx.reply('Not registered as driver');

      await ctx.answerCbQuery();
      await ctx.reply(
        `🟢 Status: ${driver.isOnline ? 'Online' : 'Offline'}\n` +
        `⭐ Rating: ${driver.rating}\n` +
        `🚗 ${driver.totalRides} rides completed`
      );
    });

    this.bot.action(/accept_ride:(.+)/, async (ctx) => {
      const rideId = ctx.match[1];
      const telegramId = ctx.from.id;
      await ctx.answerCbQuery('Accepting ride...');

      try {
        const user = await User.findOne({ telegramId });
        if (!user) {
          return ctx.reply('User not found. Please start the bot first.');
        }

        const driver = await Driver.findOne({ userId: user._id });
        if (!driver) {
          return ctx.reply('You are not registered as a driver.');
        }

        const order = await Order.findById(rideId);
        if (!order) {
          return ctx.reply('Ride not found.');
        }
        if (order.status !== RideStatus.SEARCHING) {
          return ctx.reply('This ride is no longer available.');
        }

        const driverMatchingService = DriverMatchingService.getInstance();
        await driverMatchingService.acceptRide(
          driver._id.toString(),
          rideId,
          async () => {
            order.driverId = driver._id;
            order.status = RideStatus.ACCEPTED;
            order.acceptedAt = new Date();
            await order.save();

            await ctx.reply(`✅ You accepted ride ${rideId.slice(0, 8)}...`);

            SocketService.emitToUser(order.customerId.toString(), 'ride:accepted', {
              rideId: order._id,
              driverId: driver._id,
              driverInfo: {
                car: driver.car,
                rating: driver.rating,
              },
            });
          },
          async () => {
            await ctx.reply('This ride has already been accepted by another driver.');
          }
        );
      } catch (error) {
        logger.error('Bot accept ride error:', error);
        await ctx.reply('An error occurred while accepting the ride.');
      }
    });

    this.bot.action(/reject_ride:(.+)/, async (ctx) => {
      const rideId = ctx.match[1];
      await ctx.answerCbQuery('Ride rejected');
      await ctx.reply(`❌ You rejected ride ${rideId.slice(0, 8)}...`);
      logger.info(`Driver ${ctx.from.id} rejected ride ${rideId}`);
    });
  }

  private setupHears() {
    this.bot.hears(/online/i, async (ctx) => {
      await this.toggleOnline(ctx);
    });
  }

  private async toggleOnline(ctx: any) {
    const driver = await Driver.findOne({ userId: ctx.from.id as any });
    if (!driver) {
      return ctx.reply('You are not registered as a driver.\nUse the WebApp to register.');
    }

    if (!driver.isApproved) {
      return ctx.reply('Your account is pending approval. Please wait for admin confirmation.');
    }

    driver.isOnline = !driver.isOnline;
    driver.status = driver.isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
    await driver.save();

    await ctx.reply(driver.isOnline ? '🟢 You are now online!' : '🔴 You are now offline.');
  }

  async sendRideRequest(telegramId: number, rideData: any) {
    try {
      await this.bot.telegram.sendMessage(
        telegramId,
        `🚗 New Ride Request!\n\n` +
        `📍 From: ${rideData.pickupAddress}\n` +
        `🏁 To: ${rideData.destAddress}\n` +
        `📏 Distance: ${rideData.distance} km\n` +
        `💰 Price: ${rideData.price.toLocaleString()} sum\n\n` +
        `You have 15 seconds to accept.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Accept', `accept_ride:${rideData.rideId}`),
            Markup.button.callback('❌ Reject', `reject_ride:${rideData.rideId}`),
          ],
        ])
      );
    } catch (error) {
      logger.error('Send ride request error:', error);
    }
  }

  async sendNotification(telegramId: number, message: string) {
    try {
      await this.bot.telegram.sendMessage(telegramId, message);
    } catch (error) {
      logger.error('Send notification error:', error);
    }
  }

  async broadcastToAll(message: string) {
    try {
      const users = await User.find({ isActive: true, isBanned: false });
      for (const user of users) {
        try {
          await this.bot.telegram.sendMessage(user.telegramId, message);
        } catch {
          continue;
        }
      }
    } catch (error) {
      logger.error('Broadcast error:', error);
    }
  }

  async launch() {
    try {
      if (config.telegram.mode === 'webhook' && config.telegram.webhookDomain && this.app) {
        const webhookUrl = `${config.telegram.webhookDomain}${config.telegram.webhookPath}`;
        await this.bot.telegram.setWebhook(webhookUrl);
        this.app.use(config.telegram.webhookPath, this.bot.webhookCallback(config.telegram.webhookPath));
        logger.info(`Telegram bot started in webhook mode: ${webhookUrl}`);
      } else {
        await this.bot.launch();
        logger.info('Telegram bot started in polling mode');
      }
      this.launched = true;
    } catch (error) {
      logger.error('Failed to launch bot:', error);
    }
  }

  async stop(signal: string) {
    if (!this.launched) return;
    try {
      await this.bot.stop(signal);
      this.launched = false;
      logger.info('Telegram bot stopped');
    } catch (error) {
      logger.error('Bot stop error:', error);
    }
  }
}
