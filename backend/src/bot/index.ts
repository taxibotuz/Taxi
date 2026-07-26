import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import { config } from '../config';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Order } from '../models/Order';
import { Settings } from '../models/Settings';
import { UserRole, RideStatus, DriverStatus } from '../types';
import { DriverMatchingService, DriverWithRoute } from '../services/DriverMatchingService';
import { SocketService } from '../sockets/SocketService';
import { ErrorReporter } from '../services/ErrorReporter';
import { ErrorLog } from '../models/ErrorLog';
import { logger } from '../config/logger';

const translations: Record<string, Record<string, string>> = {
  uz: {
    choose_language: 'Tilni tanlang:',
    language_saved: 'Til saqlandi!',
    welcome: 'Xush kelibsiz! 🚖\nTaxiGo xizmatidan foydalanish uchun quyidagi tugmani bosing.',
    open_taxi: '\u{1F697} TaxiGo',
    online_btn: 'Faol',
    status_btn: 'Holat',
    admin_panel_btn: '🔐 Admin panel',
    not_driver: 'Siz haydovchi sifatida ro\'yxatdan o\'tmagansiz.',
    driver_status_title: '📊 Haydovchi holati',
    status_label: 'Holat:',
    online_label: '🟢 Faol',
    offline_label: '🔴 Faol emas',
    rating_label: '⭐ Reyting:',
    rides_label: 'Safarlar:',
    earnings_label: 'Daromad:',
    sum_label: ' so\'m',
    car_label: 'Avtomobil:',
    plate_label: 'Raqam:',
    no_ride_history: 'Safarlar tarixi mavjud emas',
    recent_rides: '📋 So\'nggi safarlar:',
    status_col: 'Holat:',
    total_col: 'Jami:',
    balance_summary: '💰 Balans xulosasi',
    today_earnings: 'Bugun:',
    weekly_earnings: 'Haftalik:',
    monthly_earnings: 'Oylik:',
    total_earnings: 'Jami:',
    unauthorized: 'Sizda bu huquq yo\'q',
    no_errors: 'Xatoliklar qayd etilmagan.',
    last_errors: '📋 *So\'nggi {count} ta xatolik:*',
    status_kod: 'Holat:',
    resolved_label: 'Hal qilindi:',
    yes: 'Ha',
    no: 'Yo\'q',
    id_label: 'ID:',
    and_more: '... va yana {count} ta',
    failed_fetch_errors: 'Xatoliklarni olishda xatolik',
    support_title: '📞 Qo\'llab-quvvatlash',
    contact_us: 'Biz bilan bog\'laning:',
    phone_label: 'Telefon:',
    telegram_label: 'Telegram:',
    admin_panel_title: '🔐 Admin panel',
    open_admin_panel: '📊 Admin panelni ochish',
    dashboard_btn: '📊 Boshqaruv paneli',
    drivers_btn: '👥 Haydovchilar',
    customers_btn: '👤 Mijozlar',
    orders_btn: '📦 Buyurtmalar',
    statistics_btn: '📈 Statistika',
    online_drivers_btn: '🟢 Faol haydovchilar',
    add_driver_btn: '➕ Haydovchi qo\'shish',
    approve_driver_btn: '✅ Haydovchini tasdiqlash',
    suspend_driver_btn: '🚫 Haydovchini bloklash',
    settings_btn: '⚙ Sozlamalar',
    broadcast_btn: '📢 Ommaviy xabar',
    not_registered_as_driver: 'Haydovchi sifatida ro\'yxatdan o\'tmagansiz',
    status_online: 'Faol',
    status_offline: 'Faol emas',
    rides_completed: 'safar yakunlandi',
    accepting_ride: 'Safar qabul qilinmoqda...',
    user_not_found: 'Foydalanuvchi topilmadi. Avval botni yoqing.',
    ride_not_found: 'Safar topilmadi.',
    ride_not_available: 'Bu safar endi mavjud emas.',
    ride_accepted: '✅ Safar qabul qilindi!',
    ride_already_accepted: 'Bu safar allaqachon boshqa haydovchi tomonidan qabul qilindi.',
    ride_accept_error: 'Safarni qabul qilishda xatolik yuz berdi.',
    ride_rejected: 'Safar rad qilindi',
    ride_rejected_msg: '❌ Siz safarni rad qildingiz.',
    open_dashboard_btn: 'Boshqaruv panelini ochish',
    driver_management: '👥 Haydovchi boshqaruvi',
    open_drivers_btn: 'Haydovchilarni ochish',
    order_management: '📦 Buyurtma boshqaruvi',
    open_orders_btn: 'Buyurtmalarni ochish',
    settings_title: '⚙️ Sozlamalar',
    open_settings_btn: 'Sozlamalarni ochish',
    broadcast_title: '📢 Ommaviy xabar',
    broadcast_desc: 'Barcha faol foydalanuvchilarga xabar yuboring:',
    open_broadcast_btn: 'Ommaviy xabarni ochish',
    customer_management: '👤 Mijoz boshqaruvi',
    customer_management_desc: 'Mijozlarni to\'liq boshqarish uchun admin panelni oching.',
    statistics_title: '📈 Statistika',
    total_users: '👤 Jami foydalanuvchilar:',
    total_drivers_stat: '🚗 Jami haydovchilar:',
    total_orders: '📦 Jami buyurtmalar:',
    today_orders: '📅 Bugungi buyurtmalar:',
    stats_detail: 'Batafsil statistika uchun admin panelni oching.',
    stats_failed: 'Statistikani yuklashda xatolik. Batafsil ma\'lumot uchun admin panelni oching.',
    no_online_drivers: 'Hozir hech qanday faol haydovchi yo\'q.',
    online_drivers_list: '🟢 Faol haydovchilar ({count}):',
    view_all_drivers: 'Barcha haydovchilarni ko\'rish',
    fetch_online_failed: 'Faol haydovchilarni olishda xatolik.',
    add_driver_title: '➕ Haydovchi qo\'shish',
    add_driver_desc: 'Haydovchi qo\'shish uchun admin panelni oching:',
    approve_driver_title: '✅ Haydovchini tasdiqlash',
    approve_driver_desc: 'Haydovchi arizalarini tasdiqlash uchun admin panelni oching:',
    suspend_driver_title: '🚫 Haydovchini bloklash',
    suspend_driver_desc: 'Haydovchilarni bloklash uchun admin panelni oching:',
    not_registered: 'Siz ro\'yxatdan o\'tmagansiz. Avval botni yoqing.',
    not_driver_register: 'Siz haydovchi sifatida ro\'yxatdan o\'tmagansiz.\nWebApp orqali ro\'yxatdan o\'ting.',
    pending_approval: 'Hisobingiz tasdiqlanishini kutmoqda. Admin tasdiqlashini kuting.',
    you_are_now_online: '🟢 Siz endi faolsiz!',
    you_are_now_offline: '🔴 Siz endi faol emassiz.',
    share_location: '📍 Mijozlar sizni kuzatishi uchun WebApp dagi haydovchi xaritasida joylashuvingizni ulashing.',
    new_ride_request: '🚗 Yangi safar so\'rovi!',
    from_label: '📍 Qayerdan:',
    to_label: '🏁 Qayerga:',
    distance_label: '📏 Masofa:',
    price_label: '💰 Narx:',
    accept_time: 'Qabul qilish uchun {seconds} soniyangiz bor.',
    accept_btn: '✅ Qabul qilish',
    reject_btn: '❌ Rad qilish',
    open_map_btn: '🗺 Xarita',
    driver_distance: '🚶 Sizdan: {distance} km ({eta} daqiqa)',
    trip_distance: '🛤 Sayohat: {distance} km ({eta} daqiqa)',
    ride_expired: '⏰ Vaqt tugadi. Safar boshqa haydovchiga o\'tdi.',
    ride_cancelled_by_customer: '🚫 Mijoz safarni bekor qildi.',
    not_a_driver: 'Siz haydovchi emassiz.',
  },
  ru: {
    choose_language: 'Выберите язык:',
    language_saved: 'Язык сохранён!',
    welcome: 'Добро пожаловать! 🚖\nЧтобы пользоваться TaxiGo, нажмите кнопку ниже.',
    open_taxi: '\u{1F697} TaxiGo',
    online_btn: 'Онлайн',
    status_btn: 'Статус',
    admin_panel_btn: '🔐 Админ панель',
    not_driver: 'Вы не зарегистрированы как водитель.',
    driver_status_title: '📊 Статус водителя',
    status_label: 'Статус:',
    online_label: '🟢 Онлайн',
    offline_label: '🔴 Офлайн',
    rating_label: '⭐ Рейтинг:',
    rides_label: 'Поездки:',
    earnings_label: 'Доход:',
    sum_label: ' сум',
    car_label: 'Авто:',
    plate_label: 'Номер:',
    not_a_driver: 'Вы не водитель',
    no_ride_history: 'История поездок пуста',
    recent_rides: '📋 Последние поездки:',
    status_col: 'Статус:',
    total_col: 'Итого:',
    balance_summary: '💰 Итого по балансу',
    today_earnings: 'Сегодня:',
    weekly_earnings: 'Неделя:',
    monthly_earnings: 'Месяц:',
    total_earnings: 'Всего:',
    unauthorized: 'Нет доступа',
    no_errors: 'Ошибок не зафиксировано.',
    last_errors: '📋 *Последние {count} ошибок:*',
    status_kod: 'Статус:',
    resolved_label: 'Решена:',
    yes: 'Да',
    no: 'Нет',
    id_label: 'ID:',
    and_more: '... и ещё {count}',
    failed_fetch_errors: 'Ошибка загрузки ошибок',
    support_title: '📞 Поддержка',
    contact_us: 'Свяжитесь с нами:',
    phone_label: 'Телефон:',
    telegram_label: 'Telegram:',
    admin_panel_title: '🔐 Админ панель',
    open_admin_panel: '📊 Открыть админ панель',
    dashboard_btn: '📊 Панель',
    drivers_btn: '👥 Водители',
    customers_btn: '👤 Клиенты',
    orders_btn: '📦 Заказы',
    statistics_btn: '📈 Статистика',
    online_drivers_btn: '🟢 Водители онлайн',
    add_driver_btn: '➕ Добавить водителя',
    approve_driver_btn: '✅ Одобрить водителя',
    suspend_driver_btn: '🚫 Заблокировать водителя',
    settings_btn: '⚙ Настройки',
    broadcast_btn: '📢 Рассылка',
    not_registered_as_driver: 'Не зарегистрированы как водитель',
    status_online: 'Онлайн',
    status_offline: 'Офлайн',
    rides_completed: 'поездок завершено',
    accepting_ride: 'Принятие поездки...',
    user_not_found: 'Пользователь не найден. Сначала запустите бот.',
    ride_not_found: 'Поездка не найдена.',
    ride_not_available: 'Эта поездка больше недоступна.',
    ride_accepted: '✅ Поездка принята!',
    ride_already_accepted: 'Эта поездка уже принята другим водителем.',
    ride_accept_error: 'Ошибка при принятии поездки.',
    ride_rejected: 'Поездка отклонена',
    ride_rejected_msg: '❌ Вы отклонили поездку.',
    open_dashboard_btn: 'Открыть панель',
    driver_management: '👥 Управление водителями',
    open_drivers_btn: 'Открыть водителей',
    order_management: '📦 Управление заказами',
    open_orders_btn: 'Открыть заказы',
    settings_title: '⚙️ Настройки',
    open_settings_btn: 'Открыть настройки',
    broadcast_title: '📢 Рассылка',
    broadcast_desc: 'Отправить сообщение всем активным пользователям:',
    open_broadcast_btn: 'Открыть рассылку',
    customer_management: '👤 Управление клиентами',
    customer_management_desc: 'Для полного управления клиентами откройте админ панель.',
    statistics_title: '📈 Статистика',
    total_users: '👤 Всего пользователей:',
    total_drivers_stat: '🚗 Всего водителей:',
    total_orders: '📦 Всего заказов:',
    today_orders: '📅 Заказов сегодня:',
    stats_detail: 'Для подробной статистики откройте админ панель.',
    stats_failed: 'Ошибка загрузки статистики. Откройте админ панель.',
    no_online_drivers: 'Сейчас нет водителей онлайн.',
    online_drivers_list: '🟢 Водители онлайн ({count}):',
    view_all_drivers: 'Все водители',
    fetch_online_failed: 'Ошибка загрузки водителей онлайн.',
    add_driver_title: '➕ Добавить водителя',
    add_driver_desc: 'Для добавления водителя откройте админ панель:',
    approve_driver_title: '✅ Одобрить водителя',
    approve_driver_desc: 'Для одобрения заявок откройте админ панель:',
    suspend_driver_title: '🚫 Заблокировать водителя',
    suspend_driver_desc: 'Для блокировки водителей откройте админ панель:',
    not_registered: 'Вы не зарегистрированы. Сначала запустите бот.',
    not_driver_register: 'Вы не зарегистрированы как водитель.\nЗарегистрируйтесь через WebApp.',
    pending_approval: 'Ваш аккаунт ожидает одобрения. Дождитесь подтверждения администратора.',
    you_are_now_online: '🟢 Вы теперь онлайн!',
    you_are_now_offline: '🔴 Вы теперь офлайн.',
    share_location: '📍 Поделитесь местоположением через карту водителя в WebApp, чтобы клиенты могли вас отслеживать.',
    new_ride_request: '🚗 Новый запрос на поездку!',
    from_label: '📍 Откуда:',
    to_label: '🏁 Куда:',
    distance_label: '📏 Расстояние:',
    price_label: '💰 Цена:',
    accept_time: 'У вас {seconds} секунд на принятие.',
    accept_btn: '✅ Принять',
    reject_btn: '❌ Отклонить',
    open_map_btn: '🗺 Карта',
    driver_distance: '🚶 От вас: {distance} км ({eta} мин)',
    trip_distance: '🛤 Поездка: {distance} км ({eta} мин)',
    ride_expired: '⏰ Время вышло. Поездка передана другому водителю.',
    ride_cancelled_by_customer: '🚫 Клиент отменил поездку.',
  },
};

function interpolate(text: string, params: Record<string, string | number>): string {
  let result = text;
  Object.entries(params).forEach(([k, v]) => {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  });
  return result;
}

export class TelegramBot {
  private static _instance: TelegramBot;
  private bot: Telegraf;
  private launched: boolean = false;
  private app: express.Application | null = null;
  private rideMessages: Map<string, Array<{ telegramId: number; messageId: number }>> = new Map();

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

  private t(lang: string, key: string, params?: Record<string, string | number>): string {
    const text = this.getTranslation(lang, key);
    return params ? interpolate(text, params) : text;
  }

  private buildMainMenuKeyboard(user: any) {
    const lang = user.language || 'uz';
    const telegramId = user.telegramId;
    const isAdmin = config.telegram.adminIds.includes(telegramId);
    const isDriver = user.role === UserRole.DRIVER;

    const buttonRows: any[] = [
      [Markup.button.webApp(this.t(lang, 'open_taxi'), config.telegram.webappUrl)],
    ];

    if (isDriver) {
      buttonRows.unshift([
        Markup.button.callback(this.t(lang, 'online_btn'), 'toggle_online'),
        Markup.button.callback(this.t(lang, 'status_btn'), 'driver_status'),
      ]);
    }

    if (isAdmin) {
      buttonRows.push([
        Markup.button.webApp(this.t(lang, 'admin_panel_btn'), `${config.telegram.webappUrl}/admin`),
      ]);
    }

    return { text: this.t(lang, 'welcome'), keyboard: Markup.inlineKeyboard(buttonRows) };
  }

  private getUserLang(user: any): string {
    return user?.language || 'uz';
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
          this.t('uz', 'choose_language'),
          Markup.inlineKeyboard([
            [
              Markup.button.callback('\u{1F1FA}\u{1F1FF} O\u2018zbek', 'lang:uz'),
              Markup.button.callback('\u{1F1F7}\u{1F1FA} Русский', 'lang:ru'),
            ],
          ])
        );
      }
    });

    this.bot.command('status', async (ctx) => {
      const driver = await this.getDriverByTelegram(ctx);
      if (!driver) {
        const user = await User.findOne({ telegramId: ctx.from.id });
        const lang = this.getUserLang(user);
        return ctx.reply(this.t(lang, 'not_driver'));
      }
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);

      await ctx.reply(
        `${this.t(lang, 'driver_status_title')}\n\n` +
        `${this.t(lang, 'status_label')} ${driver.isOnline ? this.t(lang, 'online_label') : this.t(lang, 'offline_label')}\n` +
        `${this.t(lang, 'rating_label')} ${driver.rating}\n` +
        `${this.t(lang, 'rides_label')} ${driver.totalRides}\n` +
        `${this.t(lang, 'earnings_label')} ${driver.totalEarnings.toLocaleString()}${this.t(lang, 'sum_label')}\n` +
        `${this.t(lang, 'car_label')} ${driver.car.brand} ${driver.car.model} (${driver.car.color})\n` +
        `${this.t(lang, 'plate_label')} ${driver.car.plateNumber}`
      );
    });

    this.bot.command('online', async (ctx) => {
      await this.toggleOnline(ctx);
    });

    this.bot.command('offline', async (ctx) => {
      const driver = await this.getDriverByTelegram(ctx);
      if (!driver) {
        const user = await User.findOne({ telegramId: ctx.from.id });
        const lang = this.getUserLang(user);
        return ctx.reply(this.t(lang, 'not_driver'));
      }
      await Driver.findOneAndUpdate(
        { _id: driver._id },
        { isOnline: false, status: DriverStatus.OFFLINE }
      );
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      await ctx.reply(this.t(lang, 'you_are_now_offline'));
    });

    this.bot.command('history', async (ctx) => {
      const driver = await this.getDriverByTelegram(ctx);
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      if (!driver) return ctx.reply(this.t(lang, 'not_a_driver'));

      const orders = await Order.find({ driverId: driver._id })
        .sort({ createdAt: -1 })
        .limit(5);

      if (orders.length === 0) {
        return ctx.reply(this.t(lang, 'no_ride_history'));
      }

      let msg = this.t(lang, 'recent_rides') + '\n\n';
      orders.forEach((o, i) => {
        msg += `${i + 1}. ${o.pickup.address.slice(0, 30)} → ${o.destination.address.slice(0, 30)}\n`;
        msg += `   ${this.t(lang, 'status_col')} ${o.status} | ${this.t(lang, 'total_col')} ${o.pricing.total.toLocaleString()}${this.t(lang, 'sum_label')}\n\n`;
      });

      await ctx.reply(msg);
    });

    this.bot.command('balance', async (ctx) => {
      const driver = await this.getDriverByTelegram(ctx);
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      if (!driver) return ctx.reply(this.t(lang, 'not_a_driver'));

      await ctx.reply(
        `${this.t(lang, 'balance_summary')}\n\n` +
        `${this.t(lang, 'today_earnings')} ${driver.todayEarnings.toLocaleString()}${this.t(lang, 'sum_label')}\n` +
        `${this.t(lang, 'weekly_earnings')} ${driver.weeklyEarnings.toLocaleString()}${this.t(lang, 'sum_label')}\n` +
        `${this.t(lang, 'monthly_earnings')} ${driver.monthlyEarnings.toLocaleString()}${this.t(lang, 'sum_label')}\n` +
        `${this.t(lang, 'total_earnings')} ${driver.totalEarnings.toLocaleString()}${this.t(lang, 'sum_label')}`
      );
    });

    this.bot.command('errors', async (ctx) => {
      if (!config.telegram.adminIds.includes(ctx.from.id)) {
        return ctx.reply(this.t('uz', 'unauthorized'));
      }
      try {
        const errors = await ErrorLog.find().sort({ createdAt: -1 }).limit(50).lean();
        if (!errors.length) {
          return ctx.reply(this.t('uz', 'no_errors'));
        }
        let msg = this.t('uz', 'last_errors', { count: errors.length }) + '\n\n';
        for (const e of errors) {
          const date = new Date(e.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
          msg += `*${e.name}* | ${e.severity} | x${e.count}\n`;
          msg += `\`${e.message.substring(0, 100)}\`\n`;
          msg += `${date} | ${e.method || '?'} ${e.endpoint || 'N/A'}\n`;
          msg += `${this.t('uz', 'status_kod')} \`${e.statusCode || '-'}\` | ${this.t('uz', 'resolved_label')} ${e.resolved ? '✅' : '❌'}\n`;
          msg += `${this.t('uz', 'id_label')} \`${e._id}\`\n\n`;
          if (msg.length > 3800) {
            msg += this.t('uz', 'and_more', { count: errors.length - errors.indexOf(e) - 1 });
            break;
          }
        }
        await ctx.reply(msg, { parse_mode: 'Markdown' } as any);
      } catch (error) {
        logger.error('Errors command error:', error);
        await ctx.reply(this.t('uz', 'failed_fetch_errors'));
      }
    });

    this.bot.command('support', async (ctx) => {
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      await ctx.reply(
        `${this.t(lang, 'support_title')}\n\n` +
        `${this.t(lang, 'contact_us')}\n` +
        `${this.t(lang, 'phone_label')} +998781234567\n` +
        `${this.t(lang, 'telegram_label')} @taxigo_support`
      );
    });

    this.bot.command('admin', async (ctx) => {
      if (!config.telegram.adminIds.includes(ctx.from.id)) {
        return ctx.reply(this.t('uz', 'unauthorized'));
      }
      const lang = 'uz';
      await ctx.reply(
        this.t(lang, 'admin_panel_title'),
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t(lang, 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
          [Markup.button.callback(this.t(lang, 'dashboard_btn'), 'admin_dashboard')],
          [Markup.button.callback(this.t(lang, 'drivers_btn'), 'admin_drivers')],
          [Markup.button.callback(this.t(lang, 'customers_btn'), 'admin_customers')],
          [Markup.button.callback(this.t(lang, 'orders_btn'), 'admin_orders')],
          [Markup.button.callback(this.t(lang, 'statistics_btn'), 'admin_statistics')],
          [Markup.button.callback(this.t(lang, 'online_drivers_btn'), 'admin_online_drivers')],
          [Markup.button.callback(this.t(lang, 'add_driver_btn'), 'admin_add_driver')],
          [Markup.button.callback(this.t(lang, 'approve_driver_btn'), 'admin_approve_driver')],
          [Markup.button.callback(this.t(lang, 'suspend_driver_btn'), 'admin_suspend_driver')],
          [Markup.button.callback(this.t(lang, 'settings_btn'), 'admin_settings')],
          [Markup.button.callback(this.t(lang, 'broadcast_btn'), 'admin_broadcast')],
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
      const driver = await this.getDriverByTelegram(ctx);
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      if (!driver) return ctx.reply(this.t(lang, 'not_registered_as_driver'));

      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t(lang, 'online_label' )}\n` +
        `${this.t(lang, 'rating_label')} ${driver.rating}\n` +
        `${driver.totalRides} ${this.t(lang, 'rides_completed')}`
      );
    });

    this.bot.action(/accept_ride:(.+)/, async (ctx) => {
      const rideId = ctx.match[1];
      const telegramId = ctx.from.id;
      await ctx.answerCbQuery(this.t('uz', 'accepting_ride'));

      try {
        const user = await User.findOne({ telegramId });
        const lang = this.getUserLang(user);
        if (!user) {
          return ctx.reply(this.t(lang, 'user_not_found'));
        }

        const driver = await Driver.findOne({ userId: user._id });
        if (!driver) {
          return ctx.reply(this.t(lang, 'not_driver'));
        }

        const order = await Order.findById(rideId);
        if (!order) {
          return ctx.reply(this.t(lang, 'ride_not_found'));
        }
        if (order.status !== RideStatus.SEARCHING) {
          return ctx.reply(this.t(lang, 'ride_not_available'));
        }

        const driverMatchingService = DriverMatchingService.getInstance();
        await driverMatchingService.acceptRide(
          driver._id.toString(),
          rideId,
          async (notifiedDriverIds: string[]) => {
            order.driverId = driver._id;
            order.status = RideStatus.ACCEPTED;
            order.acceptedAt = new Date();
            await order.save();

            try {
              await ctx.editMessageText(this.t(lang, 'ride_accepted'));
            } catch {
              await ctx.reply(this.t(lang, 'ride_accepted'));
            }

            await this.notifyOtherDriversRideTaken(rideId, notifiedDriverIds, driver._id.toString());

            const driverUser = await User.findById(driver.userId);
            SocketService.emitToUser(order.customerId.toString(), 'ride:accepted', {
              rideId: order._id,
              driverId: driver._id,
              driverInfo: {
                firstName: driverUser?.firstName,
                photoUrl: driverUser?.photoUrl,
                car: driver.car,
                rating: driver.rating,
                phone: driverUser?.phone,
              },
            });
          },
          async () => {
            try {
              await ctx.editMessageText(this.t(lang, 'ride_already_accepted'));
            } catch {
              await ctx.reply(this.t(lang, 'ride_already_accepted'));
            }
          }
        );
      } catch (error) {
        logger.error('Bot accept ride error:', error);
        const user = await User.findOne({ telegramId: ctx.from.id });
        const lang = this.getUserLang(user);
        await ctx.reply(this.t(lang, 'ride_accept_error'));
      }
    });

    this.bot.action(/reject_ride:(.+)/, async (ctx) => {
      const rideId = ctx.match[1];
      const user = await User.findOne({ telegramId: ctx.from.id });
      const lang = this.getUserLang(user);
      await ctx.answerCbQuery(this.t(lang, 'ride_rejected'));

      try {
        await ctx.editMessageText(this.t(lang, 'ride_rejected_msg'));
      } catch {
        await ctx.reply(this.t(lang, 'ride_rejected_msg'));
      }

      const driver = await this.getDriverByTelegram(ctx);
      if (driver) {
        const order = await Order.findById(rideId);
        if (order && order.status === RideStatus.SEARCHING) {
          if (!order.rejectedDrivers.includes(driver._id)) {
            order.rejectedDrivers.push(driver._id);
            await order.save();
          }
        }
      }

      logger.info(`Driver ${ctx.from.id} rejected ride ${rideId}`);
    });

    this.bot.action('admin_dashboard', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        this.t('uz', 'dashboard_btn'),
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_dashboard_btn'), `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_drivers', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        this.t('uz', 'driver_management'),
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_drivers_btn'), `${config.telegram.webappUrl}/admin/drivers`)],
        ])
      );
    });

    this.bot.action('admin_orders', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        this.t('uz', 'order_management'),
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_orders_btn'), `${config.telegram.webappUrl}/admin/orders`)],
        ])
      );
    });

    this.bot.action('admin_settings', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        this.t('uz', 'settings_title'),
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_settings_btn'), `${config.telegram.webappUrl}/admin/settings`)],
        ])
      );
    });

    this.bot.action('admin_broadcast', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t('uz', 'broadcast_title')}\n\n${this.t('uz', 'broadcast_desc')}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_broadcast_btn'), `${config.telegram.webappUrl}/admin/broadcast`)],
        ])
      );
    });

    this.bot.action('admin_customers', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t('uz', 'customer_management')}\n\n${this.t('uz', 'customer_management_desc')}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
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
          `${this.t('uz', 'statistics_title')}\n\n` +
          `${this.t('uz', 'total_users')} ${totalUsers}\n` +
          `${this.t('uz', 'total_drivers_stat')} ${totalDrivers}\n` +
          `${this.t('uz', 'total_orders')} ${totalOrders}\n` +
          `${this.t('uz', 'today_orders')} ${todayOrders}\n\n` +
          `${this.t('uz', 'stats_detail')}`,
          Markup.inlineKeyboard([
            [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
          ])
        );
      } catch {
        await ctx.reply(this.t('uz', 'stats_failed'),
          Markup.inlineKeyboard([
            [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
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
          await ctx.reply(this.t('uz', 'no_online_drivers'));
          return;
        }

        let msg = this.t('uz', 'online_drivers_list', { count: onlineDrivers.length }) + '\n\n';
        onlineDrivers.forEach((d: any, i: number) => {
          const name = `${d.userId?.firstName || ''} ${d.userId?.lastName || ''}`.trim() || d.userId?.username || '?';
          msg += `${i + 1}. ${name} • ${d.car?.brand} ${d.car?.model}\n`;
        });

        await ctx.reply(msg, Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'view_all_drivers'), `${config.telegram.webappUrl}/admin/drivers`)],
        ]));
      } catch {
        await ctx.reply(this.t('uz', 'fetch_online_failed'));
      }
    });

    this.bot.action('admin_add_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t('uz', 'add_driver_title')}\n\n${this.t('uz', 'add_driver_desc')}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_approve_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t('uz', 'approve_driver_title')}\n\n${this.t('uz', 'approve_driver_desc')}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });

    this.bot.action('admin_suspend_driver', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(
        `${this.t('uz', 'suspend_driver_title')}\n\n${this.t('uz', 'suspend_driver_desc')}`,
        Markup.inlineKeyboard([
          [Markup.button.webApp(this.t('uz', 'open_admin_panel'), `${config.telegram.webappUrl}/admin`)],
        ])
      );
    });
  }

  private async getDriverByTelegram(ctx: any) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return null;
    return Driver.findOne({ userId: user._id });
  }

  private setupHears() {
    this.bot.hears(/online/i, async (ctx) => {
      await this.toggleOnline(ctx);
    });

    this.bot.on('message', async (ctx: any) => {
      const location = ctx.update?.message?.location;
      if (!location) return;

      try {
        const driver = await this.getDriverByTelegram(ctx);
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
    const user = await User.findOne({ telegramId: ctx.from.id });
    const lang = this.getUserLang(user);
    if (!user) {
      return ctx.reply(this.t(lang, 'not_registered'));
    }

    const driver = await Driver.findOne({ userId: user._id });
    if (!driver) {
      return ctx.reply(this.t(lang, 'not_driver_register'));
    }

    if (!driver.isApproved) {
      return ctx.reply(this.t(lang, 'pending_approval'));
    }

    driver.isOnline = !driver.isOnline;
    driver.status = driver.isOnline ? DriverStatus.ONLINE : DriverStatus.OFFLINE;
    await driver.save();

    await ctx.reply(driver.isOnline ? this.t(lang, 'you_are_now_online') : this.t(lang, 'you_are_now_offline'));

    if (driver.isOnline) {
      await ctx.reply(this.t(lang, 'share_location'));
    }
  }

  async sendRideRequest(
    telegramId: number,
    rideData: {
      rideId: string;
      pickupAddress: string;
      destAddress: string;
      pickupLat: number;
      pickupLng: number;
      destLat: number;
      destLng: number;
      tripDistance: number;
      tripDuration: number;
      driverDistance: number;
      driverEta: number;
      price: number;
    }
  ): Promise<number | null> {
    try {
      const user = await User.findOne({ telegramId });
      const lang = this.getUserLang(user);
      const seconds = (await Settings.findOne())?.search.rideExpirySeconds || 30;

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${rideData.pickupLat},${rideData.pickupLng}&destination=${rideData.destLat},${rideData.destLng}`;

      const message =
        `${this.t(lang, 'new_ride_request')}\n\n` +
        `${this.t(lang, 'from_label')} ${rideData.pickupAddress}\n` +
        `${this.t(lang, 'to_label')} ${rideData.destAddress}\n\n` +
        `${this.t(lang, 'driver_distance', { distance: rideData.driverDistance, eta: rideData.driverEta })}\n` +
        `${this.t(lang, 'trip_distance', { distance: rideData.tripDistance, eta: rideData.tripDuration })}\n` +
        `${this.t(lang, 'price_label')} ${rideData.price.toLocaleString()}${this.t(lang, 'sum_label')}\n\n` +
        `${this.t(lang, 'accept_time', { seconds })}`;

      const result = await this.bot.telegram.sendMessage(
        telegramId,
        message,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(this.t(lang, 'accept_btn'), `accept_ride:${rideData.rideId}`),
            Markup.button.callback(this.t(lang, 'reject_btn'), `reject_ride:${rideData.rideId}`),
          ],
          [Markup.button.url(this.t(lang, 'open_map_btn'), mapsUrl)],
        ])
      );

      const messages = this.rideMessages.get(rideData.rideId) || [];
      messages.push({ telegramId, messageId: result.message_id });
      this.rideMessages.set(rideData.rideId, messages);

      return result.message_id;
    } catch (error) {
      logger.error('Send ride request error:', error);
      return null;
    }
  }

  async notifyRideExpired(telegramId: number, rideId: string): Promise<void> {
    try {
      const user = await User.findOne({ telegramId });
      const lang = this.getUserLang(user);
      await this.bot.telegram.sendMessage(telegramId, this.t(lang, 'ride_expired'));
    } catch (error) {
      logger.error('Notify ride expired error:', error);
    }
  }

  async notifyRideCancelled(telegramId: number): Promise<void> {
    try {
      const user = await User.findOne({ telegramId });
      const lang = this.getUserLang(user);
      await this.bot.telegram.sendMessage(telegramId, this.t(lang, 'ride_cancelled_by_customer'));
    } catch (error) {
      logger.error('Notify ride cancelled error:', error);
    }
  }

  private async notifyOtherDriversRideTaken(
    rideId: string,
    notifiedDriverIds: string[],
    acceptedDriverId: string
  ): Promise<void> {
    const messages = this.rideMessages.get(rideId) || [];

    for (const msg of messages) {
      if (msg.messageId) {
        try {
          const user = await User.findOne({ telegramId: msg.telegramId });
          const lang = this.getUserLang(user);

          const driver = await Driver.findOne({ userId: user?._id });
          if (driver && driver._id.toString() === acceptedDriverId) continue;

          await this.bot.telegram.editMessageText(
            msg.telegramId,
            msg.messageId,
            undefined,
            this.t(lang, 'ride_already_accepted')
          );
        } catch {
          try {
            await this.bot.telegram.sendMessage(
              msg.telegramId,
              this.t('uz', 'ride_already_accepted')
            );
          } catch {
            continue;
          }
        }
      }
    }

    this.rideMessages.delete(rideId);
  }

  async deleteRideMessages(rideId: string): Promise<void> {
    const messages = this.rideMessages.get(rideId) || [];
    for (const msg of messages) {
      try {
        await this.bot.telegram.deleteMessage(msg.telegramId, msg.messageId);
      } catch {
        continue;
      }
    }
    this.rideMessages.delete(rideId);
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
