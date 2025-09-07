import { Router } from 'express';
import { MockServingController } from '../controllers/mock-serving.controller';
import { mockRateLimit } from '../middleware/security';

export function createMockServingRoutes(mockServingController: MockServingController): Router {
  const router = Router();

  // Apply mock-specific rate limiting
  router.use(mockRateLimit);

  // Handle all HTTP methods for mock endpoints
  // The * pattern will capture all paths after /mock/
  router.all('/*', mockServingController.serveMockRequest);

  // Fallback for exact /mock path (edge case)
  router.all('/', mockServingController.serveMockRequest);

  return router;
}

export function createUtilityRoutes(mockServingController: MockServingController): Router {
  const router = Router();

  // Health check endpoint
  router.get('/health', mockServingController.healthCheck);

  // Metrics endpoint
  router.get('/metrics', mockServingController.getMetrics);

  // List available mocks (useful for debugging)
  router.get('/debug/mocks', mockServingController.listAvailableMocks);

  return router;
}