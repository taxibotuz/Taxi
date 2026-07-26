import { ErrorLog, IErrorLog } from '../models/ErrorLog';
import { logger } from '../config/logger';
import { config } from '../config';
import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';

const LOG_TAIL_LINES = 20;

interface ReportContext {
  type?: IErrorLog['type'];
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  headers?: Record<string, any>;
  requestBody?: Record<string, any>;
  query?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class ErrorReporter {
  private static bot: Telegraf | null = null;
  private static rateLimitMap = new Map<string, { count: number; firstSeen: Date; notified: boolean }>();
  private static readonly RATE_WINDOW_MS = 5 * 60 * 1000;
  private static readonly RATE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;

  static init() {
    if (config.telegram.botToken) {
      ErrorReporter.bot = new Telegraf(config.telegram.botToken);
    }
    setInterval(() => ErrorReporter.cleanRateLimitMap(), 60_000);
  }

  static getAdminIds(): number[] {
    return config.telegram.adminIds || [];
  }

  private static maskSecrets(obj: Record<string, any> | undefined): Record<string, any> | undefined {
    if (!obj) return undefined;
    const secrets = ['password', 'token', 'secret', 'jwt', 'authorization', 'cookie', 'session'];
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (secrets.some(s => key.toLowerCase().includes(s))) {
        masked[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = ErrorReporter.maskSecrets(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  private static generateFingerprint(error: Error, context?: ReportContext): string {
    const msg = error.message?.substring(0, 150) || 'unknown';
    const ep = context?.endpoint || 'unknown';
    return `${error.name || 'Error'}:${msg}:${ep}`;
  }

  private static async readTailLog(): Promise<string[]> {
    try {
      const logPath = path.resolve('logs/all.log');
      if (!fs.existsSync(logPath)) return [];
      const content = await fs.promises.readFile(logPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      return lines.slice(-LOG_TAIL_LINES);
    } catch {
      return [];
    }
  }

  static async report(error: Error, context?: ReportContext) {
    try {
      const fingerprint = ErrorReporter.generateFingerprint(error, context);
      const now = new Date();

      const rateKey = ErrorReporter.rateLimitMap.get(fingerprint);
      if (rateKey) {
        const elapsed = now.getTime() - rateKey.firstSeen.getTime();
        if (elapsed < ErrorReporter.RATE_WINDOW_MS) {
          rateKey.count++;
          await ErrorLog.findOneAndUpdate(
            { fingerprint },
            { $inc: { count: 1 }, lastOccurrence: now }
          );
          const cooldownElapsed = now.getTime() - (rateKey.notified ? rateKey.firstSeen.getTime() : 0);
          if (rateKey.notified && cooldownElapsed > ErrorReporter.RATE_NOTIFY_COOLDOWN_MS) {
            rateKey.notified = false;
          }
          return;
        }
        ErrorReporter.rateLimitMap.delete(fingerprint);
      }

      const requestBody = context?.requestBody
        ? JSON.stringify(ErrorReporter.maskSecrets(context.requestBody))
        : undefined;
      const queryStr = context?.query
        ? JSON.stringify(ErrorReporter.maskSecrets(context.query))
        : undefined;
      const headersStr = context?.headers
        ? JSON.stringify(ErrorReporter.maskSecrets(context.headers))
        : undefined;
      const metadataStr = context?.metadata
        ? JSON.stringify(context.metadata)
        : undefined;

      const statusCode = context?.statusCode || 500;
      const severity: IErrorLog['severity'] = statusCode >= 500
        ? 'critical'
        : statusCode >= 400
          ? 'high'
          : 'medium';

      const logEntry = await ErrorLog.create({
        type: context?.type || 'express',
        name: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack,
        statusCode,
        endpoint: context?.endpoint,
        method: context?.method,
        requestBody,
        query: queryStr,
        userId: context?.userId,
        userAgent: context?.userAgent,
        ip: context?.ip,
        headers: headersStr,
        environment: config.env,
        gitCommit: process.env.GIT_COMMIT_HASH || process.env.RAILWAY_GIT_COMMIT_SHA || '',
        railwayDeployment: process.env.RAILWAY_DEPLOYMENT_ID || '',
        metadata: metadataStr,
        severity,
        fingerprint,
        firstOccurrence: now,
        lastOccurrence: now,
        count: 1,
        notified: true,
      });

      ErrorReporter.rateLimitMap.set(fingerprint, { count: 1, firstSeen: now, notified: true });

      await ErrorReporter.sendToTelegram(logEntry);

      await ErrorLog.findByIdAndUpdate(logEntry._id, { notified: true });
    } catch (reportError) {
      logger.error('ErrorReporter failed to report error:', reportError);
    }
  }

  static async sendToTelegram(logEntry: IErrorLog) {
    const adminIds = ErrorReporter.getAdminIds();
    if (!adminIds.length || !ErrorReporter.bot) return;

    const maskedBody = logEntry.requestBody
      ? ErrorReporter.truncate(logEntry.requestBody, 300)
      : 'N/A';
    const maskedQuery = logEntry.query || 'N/A';

    const stackClean = logEntry.stack
      ? ErrorReporter.truncate(logEntry.stack.replace?.(/\\n/g, '\n') || logEntry.stack, 1500)
      : 'N/A';

    const tail = await ErrorReporter.readTailLog();
    const tailStr = tail.length
      ? '```\n' + tail.map(l => ErrorReporter.truncate(l, 200)).join('\n').substring(0, 2000) + '\n```'
      : 'No logs available';

    const localTime = new Date(logEntry.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    const utcTime = logEntry.createdAt.toISOString();

    const msg =
      `🚨 *TaxiGo Production Error*\n\n` +
      `*Time:*\n` +
      `UTC: \`${utcTime}\`\n` +
      `Local (Tashkent): \`${localTime}\`\n\n` +
      `*Environment:* \`${logEntry.environment || 'production'}\`\n\n` +
      `*User:*\n` +
      `telegramId: \`${logEntry.userId || 'N/A'}\`\n` +
      `role: \`${'N/A'}\`\n\n` +
      `*Device:* N/A (server-side error)\n\n` +
      `*Endpoint:* \`${logEntry.method || '?'} ${logEntry.endpoint || 'N/A'}\`\n\n` +
      `*Status Code:* \`${logEntry.statusCode || 500}\`\n\n` +
      `*Error Name:* \`${logEntry.name}\`\n\n` +
      `*Error Message:*\n\`\`\`\n${logEntry.message}\n\`\`\`\n\n` +
      `*Stack Trace:*\n\`\`\`\n${stackClean}\n\`\`\`\n\n` +
      `*Request Body:*\n\`\`\`json\n${maskedBody}\n\`\`\`\n\n` +
      `*Query:*\n\`\`\`json\n${maskedQuery}\n\`\`\`\n\n` +
      `*Last 20 Logs:*\n${tailStr}\n\n` +
      `*Git Commit:* \`${logEntry.gitCommit || 'N/A'}\`\n` +
      `*Railway:* \`${logEntry.railwayDeployment || 'N/A'}\`\n` +
      `*Fingerprint:* \`${logEntry.fingerprint}\`\n` +
      `*Error Log ID:* \`${logEntry._id}\``;

    for (const adminId of adminIds) {
      try {
        await (ErrorReporter.bot.telegram as any).sendMessage(adminId, msg, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });
      } catch (e: any) {
        logger.error(`Failed to send error report to admin ${adminId}: ${e.message}`);
      }
    }
  }

  static async sendAggregatedReport(fingerprint: string, count: number) {
    const adminIds = ErrorReporter.getAdminIds();
    if (!adminIds.length || !ErrorReporter.bot) return;

    const msg =
      `⚠️ *Repeated Error*\n\n` +
      `Fingerprint: \`${fingerprint}\`\n` +
      `*This error occurred ${count} times.*\n\n` +
      `First seen and notified. Aggregated without re-notifying.`;

    for (const adminId of adminIds) {
      try {
        await (ErrorReporter.bot.telegram as any).sendMessage(adminId, msg, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });
      } catch (e: any) {
        logger.error(`Failed to send aggregated report to admin ${adminId}: ${e.message}`);
      }
    }
  }

  static async getLastErrors(limit: number = 50): Promise<any[]> {
    return ErrorLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static cleanRateLimitMap() {
    const now = Date.now();
    for (const [key, val] of ErrorReporter.rateLimitMap.entries()) {
      if (now - val.firstSeen.getTime() > ErrorReporter.RATE_WINDOW_MS * 2) {
        ErrorReporter.rateLimitMap.delete(key);
      }
    }
  }

  private static truncate(str: string, max: number): string {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }
}
