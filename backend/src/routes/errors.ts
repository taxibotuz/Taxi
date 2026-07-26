import { Router, Request, Response } from 'express';
import { ErrorLog } from '../models/ErrorLog';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.post('/report', async (req: Request, res: Response) => {
  try {
    const { name, message, stack, type, endpoint, method, statusCode, url, userAgent, platform, browser, tgVersion, appVersion } = req.body;

    const fingerprint = `${name || 'Error'}:${(message || '').substring(0, 150)}:${endpoint || url || 'unknown'}`;

    const existing = await ErrorLog.findOne({ fingerprint }).sort({ createdAt: -1 });
    if (existing) {
      const elapsed = Date.now() - new Date(existing.createdAt).getTime();
      if (elapsed < 5 * 60 * 1000) {
        await ErrorLog.findByIdAndUpdate(existing._id, {
          $inc: { count: 1 },
          lastOccurrence: new Date(),
        });
        return res.json({ logged: true, aggregated: true });
      }
    }

    await ErrorLog.create({
      type: type || 'frontend',
      name: name || 'Error',
      message: message || 'Unknown frontend error',
      stack,
      endpoint: endpoint || url,
      method: method || 'GET',
      statusCode: statusCode || 500,
      userAgent,
      environment: process.env.NODE_ENV || 'production',
      severity: 'high',
      fingerprint,
      metadata: JSON.stringify({ platform, browser, tgVersion, appVersion }),
      count: 1,
      firstOccurrence: new Date(),
      lastOccurrence: new Date(),
      notified: false,
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
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    return res.json({
      errors,
      total,
      page: +page,
      pages: Math.ceil(total / +limit),
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
