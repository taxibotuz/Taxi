import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ErrorLog } from '../models/ErrorLog';
import { ErrorReporter } from '../services/ErrorReporter';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const errorReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many error reports, please try again later.' },
});

router.post('/report', errorReportLimiter, async (req: Request, res: Response) => {
  try {
    const { name, message, stack, type, endpoint, method, statusCode, url, userAgent, platform, browser, tgVersion, appVersion } = req.body;

    const reportError = new Error(message || 'Unknown frontend error');
    reportError.name = name || 'FrontendError';
    if (stack) reportError.stack = stack;

    await ErrorReporter.report(reportError, {
      type: type === 'axios' ? 'axios' : 'frontend',
      endpoint: endpoint || url,
      method: method || 'GET',
      statusCode: statusCode || 500,
      userAgent,
      metadata: { platform, browser, tgVersion, appVersion },
    });

    return res.json({ logged: true });
  } catch (err) {
    console.error('Error reporting endpoint failed:', err);
    return res.status(500).json({ error: 'Failed to log error' });
  }
});

router.get('/admin/logs', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      severity,
      resolved,
      type,
      startDate,
      endDate,
    } = req.query as Record<string, string>;

    const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 50);
    const cappedPage = Math.max(parseInt(page, 10) || 1, 1);

    const query: Record<string, any> = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
      { endpoint: { $regex: search, $options: 'i' } },
    ];
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await ErrorLog.countDocuments(query);
    const errors = await ErrorLog.find(query)
      .sort({ createdAt: -1 })
      .skip((cappedPage - 1) * cappedLimit)
      .limit(cappedLimit)
      .lean();

    return res.json({
      errors,
      total,
      page: cappedPage,
      pages: Math.ceil(total / cappedLimit),
    });
  } catch (err) {
    console.error('Error logs fetch failed:', err);
    return res.status(500).json({ error: 'Failed to fetch error logs' });
  }
});

router.put('/admin/logs/:id/resolve', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const log = await ErrorLog.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date(), resolvedBy: (req as any).user?._id?.toString() },
      { new: true }
    );
    if (!log) return res.status(404).json({ error: 'Error log not found' });
    return res.json({ log });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve error log' });
  }
});

export default router;
