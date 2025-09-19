import { AppError } from '../middleware/error-handler';
import { StatusCodes } from 'http-status-codes';
import { logger } from './logger';

interface DatabaseErrorMapping {
  pattern: RegExp;
  statusCode: number;
  code: string;
  message: string;
}

const DATABASE_ERROR_MAPPINGS: DatabaseErrorMapping[] = [
  {
    pattern: /duplicate key value violates unique constraint/i,
    statusCode: StatusCodes.CONFLICT,
    code: 'DUPLICATE_RESOURCE',
    message: 'Resource already exists'
  },
  {
    pattern: /invalid input syntax/i,
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_INPUT',
    message: 'Invalid input provided'
  },
  {
    pattern: /foreign key constraint/i,
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'REFERENCE_ERROR',
    message: 'Invalid reference to related resource'
  },
  {
    pattern: /violates not-null constraint/i,
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'REQUIRED_FIELD_MISSING',
    message: 'Required field is missing'
  },
  {
    pattern: /connection|timeout|network/i,
    statusCode: StatusCodes.SERVICE_UNAVAILABLE,
    code: 'DATABASE_UNAVAILABLE',
    message: 'Service temporarily unavailable'
  },
  {
    pattern: /permission denied|access denied/i,
    statusCode: StatusCodes.FORBIDDEN,
    code: 'ACCESS_DENIED',
    message: 'Access denied'
  }
];

export function wrapDatabaseError(error: unknown, context?: string): never {
  if (error instanceof AppError) {
    throw error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'Unknown';

  // Log the actual error for debugging
  logger.error('Database operation failed', {
    context,
    error: {
      message: errorMessage,
      name: errorName,
      stack: error instanceof Error ? error.stack : undefined
    }
  });

  // Find matching error pattern
  for (const mapping of DATABASE_ERROR_MAPPINGS) {
    if (mapping.pattern.test(errorMessage)) {
      throw new AppError(
        mapping.message,
        mapping.statusCode,
        mapping.code
      );
    }
  }

  // Default to generic database error for unrecognized errors
  throw new AppError(
    'A database error occurred',
    StatusCodes.INTERNAL_SERVER_ERROR,
    'DATABASE_ERROR'
  );
}