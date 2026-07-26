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
import { ErrorReporter } from '../services/ErrorReporter';
import { ErrorLog } from '../models/ErrorLog';
import { logger } from '../config/logger';

const translations: Record<string, Record<string, string>> = {
  uz: {
    choose_language: 'Tilni tanlang:',
    language_saved: 'Til saqlandi!',
    welcome: 'Xush kelibsiz! 🚖\nTaxiGo xizmatidan foydalanish uchun quyidagi tugmani bosing.',
    open_taxi: '\u{1F697} Open TaxiGo',
  },
  ru: {
    choose_language: '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A:',
    language_saved: '\u042F\u0437\u044B\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D!',
    welcome: '\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C! \u{1F696}\n\u0427\u0442\u043E\u0431\u044B \u0432\u043E\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F TaxiGo, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0438\u0436\u0435.',
    open_taxi: '\u{1F697} Open TaxiGo',
  },
};

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
    this.setupErrorHandler();
  }

  static getInstance(): TelegramBot {
    return TelegramBot._instance;
  }

  setApp(app: express.Application): void {
    this.app = app;
  }

  private getTranslation(lang: string, key: string): string {
    return translations[lang]?.[key] || translations.uz[key] || key;
  }

  private buildMainMenuKeyboard(user: any) {
    const lang = user.language || 'uz';
    const t = (key: string) => this.getTranslation(lang, key);
    const telegramId = user.telegramId;
    const isAdmin = config.telegram.adminIds.includes(telegramId);
    const isDriver = user.role === UserRole.DRIVER;

    const buttonRows: any[] = [
      [Markup.button.webApp(t('open_taxi'), config.telegram.webappUrl)],
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

    return { text: t('welcome'), keyboard: Markup.inlineKeyboard(buttonRows) };
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

      if (config.telegram.adminIds.includes(telegramId) && user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
        await user.save();
      }

      if (user.language) {
        const { text, keyboard } = this.buildMainMenuKeyboard(user);
        await ctx.reply(text, keyboard);
      } else {
        await ctx.reply(
          'Tilni tanlang / \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u044F\u0437\u044B\u043A:',
          Markup.inlineKeyboard([
            [
              Markup.button.callback('\u{1F1FA}\u{1F1FF} O\u2018zbek', 'lang:uz'),
              Markup.button.callback('\u{1F1F7}\u{1F1FA} \u0420\u0443\u0441\u0441\u043A\u0438\u0439', 'lang:ru'),
            ],
          ])
        );
      }
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
      if (driver) {
        await ctx.reply('📍 Live location tracking stopped.');
      }
    });

    this.bot.hears(/location/i, async (ctx: any) => {
      try {
        const driver = await Driver.findOne({ userId: ctx.from.id as any });
        if (!driver || !driver.isOnline) return;

        const location = ctx.message?.location;
        if (!location) return;

        await Driver.findOneAndUpdate(
          { userId: ctx.from.id as any },
          {
            'currentLocation.coordinates': [location.longitude, location.latitude],
            'currentLocation.updatedAt': new Date(),
          }
        );

        await SocketService.emitToUser(
          driver.userId.toString(),
          'driver:location',
          {
            driverId: driver._id,
            lat: location.latitude,
            lng: location.longitude,
          }
        );
      } catch (error) {
        logger.error('Telegram location error:', error);
      }
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

    this.bot.command('errors', async (ctx) => {
      if (!config.telegram.adminIds.includes(ctx.from.id)) {
        return ctx.reply('Unauthorized');
      }
      try {
        const errors = await ErrorLog.find().sort({ createdAt: -1 }).limit(50).lean();
        if (!errors.length) {
          return ctx.reply('No errors recorded.');
        }
        let msg = `📋 *Last ${errors.length} Errors:*\n\n`;
        for (const e of errors) {
          const date = new Date(e.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
          msg += `*${e.name}* | ${e.severity} | x${e.count}\n`;
          msg += `\`${e.message.substring(0, 100)}\`\n`;
          msg += `${date} | ${e.method || '?'} ${e.endpoint || 'N/A'}\n`;
          msg += `Status: \`${e.statusCode || '-'}\` | Resolved: ${e.resolved ? '✅' : '❌'}\n`;
          msg += `ID: \`${e._id}\`\n\n`;
          if (msg.length > 3800) {
            msg += `... and ${errors.length - errors.indexOf(e) - 1} more`;
            break;
          }
        }
        await ctx.reply(msg, { parse_mode: 'Markdown' } as any);
      } catch (error) {
        logger.error('Errors command error:', error);
        await ctx.reply('Failed to fetch errors');
      }
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
          [Markup.button.webApp('📊 Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
          [Markup.button.callback('📊 Dashboard', 'admin_dashboard')],
          [Markup.button.callback('👥 Drivers', 'admin_drivers')],
          [Markup.button.callback('👤 Customers', 'admin_customers')],
          [Markup.button.callback('📦 Orders', 'admin_orders')],
          [Markup.button.callback('📈 Statistics', 'admin_statistics')],
          [Markup.button.callback('🟢 Online Drivers', 'admin_online_drivers')],
          [Markup.button.callback('➕ Add Driver', 'admin_add_driver')],
          [Markup.button.callback('✅ Approve Driver', 'admin_approve_driver')],
          [Markup.button.callback('🚫 Suspend Driver', 'admin_suspend_driver')],
          [Markup.button.callback('⚙ Settings', 'admin_settings')],
          [Markup.button.callback('📢 Broadcast', 'admin_broadcast')],
        ])
      );
    });
  }

  private setupActions() {
    this.bot.action(/lang:(.+)/, async (ctx) => {
      const lang = ctx.match[1];
      const telegramId = ctx.from.id;

      await User.findOneAndUpdate({ telegramId }, { language: lang });
      await ctx.answerCbQuery(this.getTranslation(lang, 'language_saved'));

      const user = await User.findOne({ telegramId });
      if (!user) return;

      const { text, keyboard } = this.buildMainMenuKeyboard(user);
      try {
        await ctx.editMessageText(text, {
          reply_markup: keyboard.reply_markup,
        });
      } catch {
        await ctx.reply(text, keyboard);
      }
    });

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

    this.bot.action('admin_dashboard', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '📊 Dashboard',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Dashboard', `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_drivers', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '👥 Driver Management',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Drivers', `${config.telegram.webappUrl}/admin/drivers`)],
        ])
      );
    });

    this.bot.action('admin_orders', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '📦 Order Management',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Orders', `${config.telegram.webappUrl}/admin/orders`)],
        ])
      );
    });

    this.bot.action('admin_settings', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '⚙️ Settings',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Settings', `${config.telegram.webappUrl}/admin/settings`)],
        ])
      );
    });

    this.bot.action('admin_broadcast', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '📢 Broadcast Message\n\nSend a message to all active users:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Broadcast', `${config.telegram.webappUrl}/admin/broadcast`)],
        ])
      );
    });

    this.bot.action('admin_customers', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '👤 Customer Management\n\nOpen the Admin Panel for full customer management.',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_statistics', async (ctx) => {
      await ctx.answerCbQuery();
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, totalDrivers, totalOrders, todayOrders] = await Promise.all([
          User.countDocuments({}),
          Driver.countDocuments({}),
          Order.countDocuments({}),
          Order.countDocuments({ createdAt: { $gte: today } }),
        ]);
        await ctx.reply(
          `📈 Statistics\n\n` +
          `👤 Total Users: ${totalUsers}\n` +
          `🚗 Total Drivers: ${totalDrivers}\n` +
          `📦 Total Orders: ${totalOrders}\n` +
          `📅 Today's Orders: ${todayOrders}\n\n` +
          `For detailed statistics, open the Admin Panel.`,
          Markup.inlineKeyboard([
            [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
          ])
        );
      } catch {
        await ctx.reply('Failed to load statistics. Open Admin Panel for details.',
          Markup.inlineKeyboard([
            [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
          ])
        );
      }
    });

    this.bot.action('admin_online_drivers', async (ctx) => {
      await ctx.answerCbQuery();
      try {
        const onlineDrivers = await Driver.find({ isOnline: true, status: 'online' })
          .populate('userId', 'firstName lastName username phone')
          .limit(20)
          .lean();

        if (onlineDrivers.length === 0) {
          await ctx.reply('No drivers are currently online.');
          return;
        }

        let msg = `🟢 Online Drivers (${onlineDrivers.length}):\n\n`;
        onlineDrivers.forEach((d: any, i: number) => {
          const name = `${d.userId?.firstName || ''} ${d.userId?.lastName || ''}`.trim() || d.userId?.username || 'Unknown';
          msg += `${i + 1}. ${name} • ${d.car?.brand} ${d.car?.model}\n`;
        });

        await ctx.reply(msg, Markup.inlineKeyboard([
          [Markup.button.webApp('View All Drivers', `${config.telegram.webappUrl}/admin/drivers`)],
        ]));
      } catch {
        await ctx.reply('Failed to fetch online drivers.');
      }
    });

    this.bot.action('admin_add_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '➕ Add Driver\n\nUse the Admin Panel to add a driver:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_approve_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '✅ Approve Driver\n\nUse the Admin Panel to approve driver applications:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_suspend_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        '🚫 Suspend Driver\n\nUse the Admin Panel to suspend drivers:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });
  }

  private setupHears() {
    this.bot.hears(/online/i, async (ctx) => {
      await this.toggleOnline(ctx);
    });

    this.bot.on('message', async (ctx: any) => {
      const location = ctx.update?.message?.location;
      if (!location) return;

      try {
        const driver = await Driver.findOne({ userId: ctx.from.id as any });
        if (!driver || !driver.isOnline) return;

        await Driver.findOneAndUpdate(
          { userId: ctx.from.id as any },
          {
            'currentLocation.coordinates': [location.longitude, location.latitude],
            'currentLocation.updatedAt': new Date(),
          }
        );

        await SocketService.emitToUser(
          driver.userId.toString(),
          'driver:location',
          {
            driverId: driver._id,
            lat: location.latitude,
            lng: location.longitude,
          }
        );
      } catch (error) {
        logger.error('Telegram location error:', error);
      }
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

     if (driver.isOnline) {
       await ctx.reply(
         '📍 Please send your current location so customers can track your driver.',
         Markup.inlineKeyboard([
           [Markup.button.webApp('Open Admin Panel', `${config.telegram.webappUrl}/admin`)],
         ])
       );
     }
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

  private setupErrorHandler() {
    this.bot.catch((err: any) => {
      logger.error('Telegram bot error:', err);
      ErrorReporter.report(err instanceof Error ? err : new Error(String(err)), { type: 'telegram_bot' });
    });
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
