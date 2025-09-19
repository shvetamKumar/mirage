import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import { logger } from '../utils/logger';

const tokens = new csrf({
  secretLength: 32,
  saltLength: 32
});

const getSecret = (): string => {
  return process.env.CSRF_SECRET || 'fallback-csrf-secret';
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF protection for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF protection for specific endpoints that don't need it
  const exemptPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/logout'
  ];

  if (exemptPaths.includes(req.path)) {
    return next();
  }

  const secret = getSecret();
  const token = req.headers['x-csrf-token'] as string || req.body._csrf;

  if (!token) {
    logger.warn('CSRF token missing', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(403).json({
      message: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  if (!tokens.verify(secret, token)) {
    logger.warn('CSRF validation failed', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    res.status(403).json({
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
    return;
  }

  next();
};

export const generateCsrfToken = (req: Request, res: Response): string => {
  const secret = getSecret();
  return tokens.create(secret);
};