import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { MockEndpointService } from '../services/mock-endpoint.service';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import {
  CreateMockEndpointRequest,
  UpdateMockEndpointRequest,
  MockEndpointListQuery,
  CreateMockEndpointResponse,
  UpdateMockEndpointResponse,
  DeleteMockEndpointResponse,
} from '../types';

export class MockEndpointController {
  constructor(private mockEndpointService: MockEndpointService) {}

  createEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: CreateMockEndpointRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
    }

    logger.info('Creating mock endpoint', {
      userId,
      name: data.name,
      method: data.method,
      url_pattern: data.url_pattern,
    });

    const result = await this.mockEndpointService.createEndpoint(data, userId);

    if (result.errors) {
      throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
        errors: result.errors,
      });
    }

    const response: CreateMockEndpointResponse = {
      id: result.id,
      message: 'Mock endpoint created successfully',
    };

    res.status(StatusCodes.CREATED).json(response);
  });

  getEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
    }

    if (!id) {
      throw new AppError('Endpoint ID is required', StatusCodes.BAD_REQUEST, 'INVALID_REQUEST');
    }

    logger.info('Getting mock endpoint', { id, userId });

    const endpoint = await this.mockEndpointService.getEndpoint(id, userId);

    if (!endpoint) {
      throw new AppError('Mock endpoint not found', StatusCodes.NOT_FOUND, 'ENDPOINT_NOT_FOUND');
    }

    res.status(StatusCodes.OK).json(endpoint);
  });

  listEndpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
    }

    const isActiveQuery = req.query['is_active'];
    const query: MockEndpointListQuery = {};

    if (isActiveQuery === 'true') {
      query.is_active = true;
    } else if (isActiveQuery === 'false') {
      query.is_active = false;
    }

    const methodQuery = req.query['method'] as string | undefined;
    if (methodQuery && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(methodQuery)) {
      query.method = methodQuery as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    }
    if (req.query['search']) {
      query.search = req.query['search'] as string;
    }
    if (req.query['limit']) {
      query.limit = parseInt(req.query['limit'] as string, 10);
    }
    if (req.query['offset']) {
      query.offset = parseInt(req.query['offset'] as string, 10);
    }

    logger.info('Listing mock endpoints', { query, userId });

    const result = await this.mockEndpointService.listEndpoints(query, userId);

    res.status(StatusCodes.OK).json(result);
  });

  updateEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateMockEndpointRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
    }

    if (!id) {
      throw new AppError('Endpoint ID is required', StatusCodes.BAD_REQUEST, 'INVALID_REQUEST');
    }

    logger.info('Updating mock endpoint', { id, userId, fields: Object.keys(data) });

    const result = await this.mockEndpointService.updateEndpoint(id, data, userId);

    if (result.errors) {
      throw new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
        errors: result.errors,
      });
    }

    if (!result.success) {
      throw new AppError(
        'Mock endpoint not found or update failed',
        StatusCodes.NOT_FOUND,
        'ENDPOINT_NOT_FOUND'
      );
    }

    const response: UpdateMockEndpointResponse = {
      id: id,
      message: 'Mock endpoint updated successfully',
    };

    res.status(StatusCodes.OK).json(response);
  });

  deleteEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
    }

    if (!id) {
      throw new AppError('Endpoint ID is required', StatusCodes.BAD_REQUEST, 'INVALID_REQUEST');
    }

    logger.info('Deleting mock endpoint', { id, userId });

    const success = await this.mockEndpointService.deleteEndpoint(id, userId);

    if (!success) {
      throw new AppError('Mock endpoint not found', StatusCodes.NOT_FOUND, 'ENDPOINT_NOT_FOUND');
    }

    const response: DeleteMockEndpointResponse = {
      id: id,
      message: 'Mock endpoint deactivated successfully',
    };

    res.status(StatusCodes.OK).json(response);
  });
}
