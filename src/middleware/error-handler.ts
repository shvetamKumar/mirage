import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { ApiError } from '../types';

// Function to sanitize sensitive data from request objects
const sanitizeRequestData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'authorization', 'cookie', 'x-api-key',
    'jwt', 'secret', 'key', 'auth', 'session', 'csrf'
  ];

  const sanitized = { ...data };

  // Remove sensitive fields from body
  if (sanitized.body && typeof sanitized.body === 'object') {
    sanitized.body = { ...sanitized.body };
    sensitiveFields.forEach(field => {
      if (field in sanitized.body) {
        sanitized.body[field] = '[REDACTED]';
      }
    });
  }

  // Remove sensitive headers
  if (sanitized.headers && typeof sanitized.headers === 'object') {
    sanitized.headers = { ...sanitized.headers };
    Object.keys(sanitized.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized.headers[key] = '[REDACTED]';
      }
    });
  }

  return sanitized;
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: Record<string, unknown> | undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = StatusCodes.BAD_REQUEST;
    code = 'VALIDATION_ERROR';
    message = error.message;
  }

  const apiError: ApiError = {
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Log error details (sanitized)
  const sanitizedRequest = sanitizeRequestData({
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  logger.error('Request error', {
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name,
    },
    request: sanitizedRequest,
    response: {
      statusCode,
      code,
    },
  });

  res.status(statusCode).json(apiError);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const apiError: ApiError = {
    message: 'Resource not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  logger.warn('Resource not found', {
    method: req.method,
    url: req.url,
    headers: req.headers,
  });

  res.status(StatusCodes.NOT_FOUND).json(apiError);
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
