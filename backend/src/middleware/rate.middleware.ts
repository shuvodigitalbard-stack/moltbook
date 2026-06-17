// Rate Limiting Middleware (in-memory for dev, Redis for prod)
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const key = req.userId || req.ip || 'anonymous';
    const now = Date.now();

    const entry = rateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    entry.count++;
    next();
  };
};
