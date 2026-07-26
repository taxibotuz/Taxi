import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ErrorReporter } from '../services/ErrorReporter';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  if (statusCode >= 500) {
    logger.error('Server error:', err);
    ErrorReporter.report(err, {
      type: 'express',
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      userId: (req as any).user?._id?.toString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      headers: req.headers as Record<string, any>,
      requestBody: req.body as Record<string, any>,
      query: req.query as Record<string, any>,
    });
  } else if (statusCode >= 400) {
    logger.warn(`Client error (${statusCode}): ${err.message}`);
  }

  return res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : err.message,
  });
};

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Resource not found' });
};
