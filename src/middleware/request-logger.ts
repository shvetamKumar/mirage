import morgan from 'morgan';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Create custom morgan token for request ID
morgan.token('id', (req: Request) => {
  return req.headers['x-request-id'] as string || 'unknown';
});

// Create custom morgan token for response time with more precision
morgan.token('response-time-ms', (req: Request, res: Response) => {
  const startTime = res.locals.startTime;
  if (!startTime) {
    return '0';
  }
  const diff = process.hrtime(startTime);
  return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
});

// Custom format function for structured logging
const morganFormat = ':method :url :status :response-time-ms ms - :res[content-length] bytes';

// Development format (more readable)
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Production format (structured JSON)
const prodFormat = morganFormat;

export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  {
    stream: {
      write: (message: string) => {
        if (process.env.NODE_ENV === 'production') {
          try {
            const logData = JSON.parse(message.trim());
            logger.info('HTTP Request', logData);
          } catch {
            logger.info('HTTP Request', { message: message.trim() });
          }
        } else {
          logger.info(message.trim());
        }
      },
    },
    skip: (req: Request, res: Response) => {
      // Skip logging for health check endpoints
      return req.path === '/health' || req.path === '/metrics';
    },
  }
);

// Middleware to add start time for response time calculation
export const addResponseTime = (req: Request, res: Response, next: () => void): void => {
  res.locals.startTime = process.hrtime();
  next();
};