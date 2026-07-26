import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    telegramId: number;
    role: string;
    firstName: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      _id: string;
      telegramId: number;
      role: string;
    };

    const user = await User.findById(decoded._id).select('-__v');
    if (!user || user.isBanned || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      _id: user._id.toString(),
      telegramId: user.telegramId,
      role: user.role,
      firstName: user.firstName,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      req.user = decoded;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};
