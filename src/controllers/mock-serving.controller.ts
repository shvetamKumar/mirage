import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { MockEndpointService } from '../services/mock-endpoint.service';
import { asyncHandler, AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { MockRequest, HttpMethod } from '../types';

export class MockServingController {
  constructor(private mockEndpointService: MockEndpointService) {}

  serveMockRequest = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    // Extract the mock path by removing the /mock prefix
    const mockPath = req.path.replace(/^\/mock/, '');

    // Construct mock request object
    const mockRequest: MockRequest = {
      method: req.method.toUpperCase() as HttpMethod,
      url: mockPath || '/',
      headers: req.headers as Record<string, string>,
      body: req.body,
      query: req.query as Record<string, string>,
    };

    logger.info('Processing mock request', {
      method: mockRequest.method,
      url: mockRequest.url,
      originalUrl: req.originalUrl,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
    });

    try {
      const mockResponse = await this.mockEndpointService.handleMockRequest(mockRequest);

      if (!mockResponse) {
        // No matching endpoint found
        const notFoundResponse = {
          error: 'No matching mock endpoint found',
          message: `No mock endpoint configured for ${mockRequest.method} ${mockRequest.url}`,
          code: 'MOCK_ENDPOINT_NOT_FOUND',
          timestamp: new Date().toISOString(),
          path: mockRequest.url,
        };

        logger.info('Mock endpoint not found', {
          method: mockRequest.method,
          url: mockRequest.url,
          processingTime: Date.now() - startTime,
        });

        res.status(StatusCodes.NOT_FOUND).json(notFoundResponse);
        return;
      }

      // Apply custom headers if provided
      if (mockResponse.headers) {
        Object.entries(mockResponse.headers).forEach(([key, value]) => {
          res.set(key, value);
        });
      }

      // Add standard mock headers
      res.set({
        'Content-Type': 'application/json',
        'X-Mirage-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Mirage-Delay-Applied': `${mockResponse.delay_ms}ms`,
      });

      // Store endpoint ID in request for usage tracking
      const endpointId = mockResponse.headers?.['X-Mirage-Endpoint-Id'];
      if (endpointId) {
        (req as any).endpointId = endpointId;
      }

      logger.info('Mock request served successfully', {
        method: mockRequest.method,
        url: mockRequest.url,
        statusCode: mockResponse.status_code,
        delayMs: mockResponse.delay_ms,
        processingTime: Date.now() - startTime,
        endpointId,
      });

      res.status(mockResponse.status_code).json(mockResponse.data);
    } catch (error) {
      logger.error('Error processing mock request', {
        method: mockRequest.method,
        url: mockRequest.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      });

      // Re-throw to let error handler deal with it
      throw error;
    }
  });

  // Health check endpoint for the mock service
  healthCheck = (_req: Request, res: Response): void => {
    const healthStatus = {
      status: 'healthy',
      service: 'mirage-mock-serving',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };

    res.status(StatusCodes.OK).json(healthStatus);
  };

  // Metrics endpoint for monitoring
  getMetrics = (_req: Request, res: Response): void => {
    const metrics = {
      service: 'mirage-mock-serving',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    };

    res.status(StatusCodes.OK).json(metrics);
  };

  // Endpoint to list available mock endpoints for debugging
  listAvailableMocks = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      // For debugging, list all active endpoints regardless of user
      const result = await this.mockEndpointService.listAllActiveEndpoints();

      const availableMocks = result.endpoints.map(endpoint => ({
        id: endpoint.id,
        name: endpoint.name,
        method: endpoint.method,
        url_pattern: endpoint.url_pattern,
        mock_url: `/mock${endpoint.url_pattern}`,
        response_status_code: endpoint.response_status_code,
        response_delay_ms: endpoint.response_delay_ms,
        created_at: endpoint.created_at,
      }));

      const response = {
        total: result.total,
        count: availableMocks.length,
        mocks: availableMocks,
        timestamp: new Date().toISOString(),
      };

      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      logger.error('Error listing available mocks', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(
        'Failed to retrieve available mock endpoints',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'INTERNAL_ERROR'
      );
    }
  });
}
