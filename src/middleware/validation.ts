import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './error-handler';
import { ValidationError } from '../types';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
      errors: validationErrors,
    });
  }

  next();
};

// Mock endpoint validation rules
export const createMockEndpointValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Invalid HTTP method'),

  body('url_pattern')
    .notEmpty()
    .withMessage('URL pattern is required')
    .matches(/^\/.*/)
    .withMessage('URL pattern must start with /')
    .isLength({ max: 500 })
    .withMessage('URL pattern must be less than 500 characters'),

  body('request_schema')
    .optional()
    .isObject()
    .withMessage('Request schema must be a valid JSON object'),

  body('response_data')
    .notEmpty()
    .withMessage('Response data is required')
    .isObject()
    .withMessage('Response data must be a valid JSON object'),

  body('response_status_code')
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage('Response status code must be between 100 and 599'),

  body('response_delay_ms')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Response delay must be between 0 and 10000 milliseconds'),

  body('created_by')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Created by must be less than 255 characters'),

  handleValidationErrors,
];

export const updateMockEndpointValidation = [
  param('id').isUUID().withMessage('Invalid endpoint ID'),

  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  body('method')
    .optional()
    .isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .withMessage('Invalid HTTP method'),

  body('url_pattern')
    .optional()
    .matches(/^\/.*/)
    .withMessage('URL pattern must start with /')
    .isLength({ max: 500 })
    .withMessage('URL pattern must be less than 500 characters'),

  body('request_schema')
    .optional()
    .isObject()
    .withMessage('Request schema must be a valid JSON object'),

  body('response_data')
    .optional()
    .isObject()
    .withMessage('Response data must be a valid JSON object'),

  body('response_status_code')
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage('Response status code must be between 100 and 599'),

  body('response_delay_ms')
    .optional()
    .isInt({ min: 0, max: 10000 })
    .withMessage('Response delay must be between 0 and 10000 milliseconds'),

  handleValidationErrors,
];

export const getMockEndpointValidation = [
  param('id').isUUID().withMessage('Invalid endpoint ID'),

  handleValidationErrors,
];

export const deleteMockEndpointValidation = [
  param('id').isUUID().withMessage('Invalid endpoint ID'),

  handleValidationErrors,
];

export const listMockEndpointsValidation = [
  query('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

  query('method')
    .optional()
    .isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    .withMessage('Invalid HTTP method'),

  query('search')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Search term must be less than 255 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),

  handleValidationErrors,
];
