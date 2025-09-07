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
    
    logger.info('Creating mock endpoint', { name: data.name, method: data.method, url_pattern: data.url_pattern });

    const result = await this.mockEndpointService.createEndpoint(data);

    if (result.errors) {
      throw new AppError(
        'Validation failed',
        StatusCodes.BAD_REQUEST,
        'VALIDATION_ERROR',
        { errors: result.errors }
      );
    }

    const response: CreateMockEndpointResponse = {
      id: result.id,
      message: 'Mock endpoint created successfully',
    };

    res.status(StatusCodes.CREATED).json(response);
  });

  getEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    logger.info('Getting mock endpoint', { id });

    const endpoint = await this.mockEndpointService.getEndpoint(id);

    if (!endpoint) {
      throw new AppError(
        'Mock endpoint not found',
        StatusCodes.NOT_FOUND,
        'ENDPOINT_NOT_FOUND'
      );
    }

    res.status(StatusCodes.OK).json(endpoint);
  });

  listEndpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: MockEndpointListQuery = {
      is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      method: req.query.method as MockEndpointListQuery['method'],
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };

    logger.info('Listing mock endpoints', { query });

    const result = await this.mockEndpointService.listEndpoints(query);

    res.status(StatusCodes.OK).json(result);
  });

  updateEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateMockEndpointRequest = req.body;

    logger.info('Updating mock endpoint', { id, fields: Object.keys(data) });

    const result = await this.mockEndpointService.updateEndpoint(id, data);

    if (result.errors) {
      throw new AppError(
        'Validation failed',
        StatusCodes.BAD_REQUEST,
        'VALIDATION_ERROR',
        { errors: result.errors }
      );
    }

    if (!result.success) {
      throw new AppError(
        'Mock endpoint not found or update failed',
        StatusCodes.NOT_FOUND,
        'ENDPOINT_NOT_FOUND'
      );
    }

    const response: UpdateMockEndpointResponse = {
      id,
      message: 'Mock endpoint updated successfully',
    };

    res.status(StatusCodes.OK).json(response);
  });

  deleteEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    logger.info('Deleting mock endpoint', { id });

    const success = await this.mockEndpointService.deleteEndpoint(id);

    if (!success) {
      throw new AppError(
        'Mock endpoint not found',
        StatusCodes.NOT_FOUND,
        'ENDPOINT_NOT_FOUND'
      );
    }

    const response: DeleteMockEndpointResponse = {
      id,
      message: 'Mock endpoint deactivated successfully',
    };

    res.status(StatusCodes.OK).json(response);
  });
}