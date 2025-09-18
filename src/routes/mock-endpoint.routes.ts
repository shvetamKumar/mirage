import { Router } from 'express';
import { MockEndpointController } from '../controllers/mock-endpoint.controller';
import {
  createMockEndpointValidation,
  updateMockEndpointValidation,
  getMockEndpointValidation,
  deleteMockEndpointValidation,
  listMockEndpointsValidation,
} from '../middleware/validation';
import { apiRateLimit } from '../middleware/security';
import { authMiddleware } from '../middleware/auth';

export function createMockEndpointRoutes(mockEndpointController: MockEndpointController): Router {
  const router = Router();

  // Apply rate limiting, authentication, and quota checking to all routes
  router.use(apiRateLimit);
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.checkQuota('requests'));
  router.use(authMiddleware.checkQuota('endpoints'));

  // POST /api/v1/mock-endpoints - Create a new mock endpoint
  router.post(
    '/',
    authMiddleware.requireVerified,
    createMockEndpointValidation,
    authMiddleware.trackUsage,
    mockEndpointController.createEndpoint
  );

  // GET /api/v1/mock-endpoints - List mock endpoints
  router.get('/', listMockEndpointsValidation, mockEndpointController.listEndpoints);

  // GET /api/v1/mock-endpoints/:id - Get a specific mock endpoint
  router.get('/:id', getMockEndpointValidation, mockEndpointController.getEndpoint);

  // PUT /api/v1/mock-endpoints/:id - Update a mock endpoint
  router.put(
    '/:id',
    authMiddleware.requireVerified,
    updateMockEndpointValidation,
    authMiddleware.trackUsage,
    mockEndpointController.updateEndpoint
  );

  // DELETE /api/v1/mock-endpoints/:id - Soft delete a mock endpoint
  router.delete(
    '/:id',
    authMiddleware.requireVerified,
    deleteMockEndpointValidation,
    authMiddleware.trackUsage,
    mockEndpointController.deleteEndpoint
  );

  return router;
}
