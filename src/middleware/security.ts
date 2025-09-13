import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from './error-handler';

// Rate limiting middleware
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}): ReturnType<typeof rateLimit> => {
  return rateLimit({
    windowMs: options?.windowMs || config.rateLimit.windowMs,
    max: options?.max || config.rateLimit.max,
    message: {
      error: options?.message || 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        method: req.method,
        url: req.url,
        headers: req.headers,
      });

      res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        error: options?.message || 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    },
  });
};

// Default rate limiter for API endpoints
export const apiRateLimit = createRateLimiter();

// Stricter rate limiter for mock endpoints to prevent abuse
export const mockRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: 'Too many mock requests, please slow down',
});

// Environment validation middleware
export const environmentGuard = (req: Request, res: Response, next: NextFunction): void => {
  const nodeEnv = config.server.nodeEnv;

  if (nodeEnv === 'production') {
    // Add warning headers for production environment
    res.set({
      'X-Mirage-Environment': 'production',
      'X-Mirage-Warning': 'This is a mock service and should not be used in production',
    });

    logger.warn('Mock service accessed in production environment', {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimit = (maxSizeBytes: number = 1024 * 1024): ((req: Request, res: Response, next: NextFunction) => void) => {
  // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');

    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new AppError(
        `Request body too large. Maximum size is ${maxSizeBytes} bytes`,
        StatusCodes.REQUEST_TOO_LONG,
        'REQUEST_TOO_LARGE'
      );
    }

    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });

  // Add mock service identification headers
  res.set({
    'X-Mirage-Service': 'true',
    'X-Mirage-Version': '1.0.0',
  });

  next();
};

// IP whitelist middleware (for development/testing environments)
export const ipWhitelist = (allowedIPs: string[]): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    // Allow localhost and internal IPs in development
    if (config.server.nodeEnv !== 'production') {
      const allowedPatterns = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost', ...allowedIPs];

      if (allowedPatterns.some(pattern => clientIP.includes(pattern))) {
        return next();
      }
    }

    // Check against whitelist
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP address not in whitelist', {
        ip: clientIP,
        method: req.method,
        url: req.url,
      });

      throw new AppError('Access denied', StatusCodes.FORBIDDEN, 'IP_NOT_WHITELISTED');
    }

    next();
  };
};
