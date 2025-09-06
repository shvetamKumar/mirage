import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { ApiError } from '../types';

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
  } else if (error.message.includes('duplicate key value violates unique constraint')) {
    statusCode = StatusCodes.CONFLICT;
    code = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
  } else if (error.message.includes('invalid input syntax')) {
    statusCode = StatusCodes.BAD_REQUEST;
    code = 'INVALID_INPUT';
    message = 'Invalid input provided';
  }

  const apiError: ApiError = {
    message,
    code,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // Log error details
  logger.error('Request error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
    },
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

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};