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

export function createMockEndpointRoutes(mockEndpointController: MockEndpointController): Router {
  const router = Router();

  // Apply rate limiting to all routes
  router.use(apiRateLimit);

  // POST /api/v1/mock-endpoints - Create a new mock endpoint
  router.post(
    '/',
    createMockEndpointValidation,
    mockEndpointController.createEndpoint
  );

  // GET /api/v1/mock-endpoints - List mock endpoints
  router.get(
    '/',
    listMockEndpointsValidation,
    mockEndpointController.listEndpoints
  );

  // GET /api/v1/mock-endpoints/:id - Get a specific mock endpoint
  router.get(
    '/:id',
    getMockEndpointValidation,
    mockEndpointController.getEndpoint
  );

  // PUT /api/v1/mock-endpoints/:id - Update a mock endpoint
  router.put(
    '/:id',
    updateMockEndpointValidation,
    mockEndpointController.updateEndpoint
  );

  // DELETE /api/v1/mock-endpoints/:id - Soft delete a mock endpoint
  router.delete(
    '/:id',
    deleteMockEndpointValidation,
    mockEndpointController.deleteEndpoint
  );

  return router;
}