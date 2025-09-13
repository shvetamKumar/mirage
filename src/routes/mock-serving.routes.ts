import { Router } from 'express';
import { MockServingController } from '../controllers/mock-serving.controller';
import { mockRateLimit } from '../middleware/security';
import { authMiddleware } from '../middleware/auth';

export function createMockServingRoutes(mockServingController: MockServingController): Router {
  const router = Router();

  // Apply mock-specific rate limiting and optional authentication
  router.use(mockRateLimit);
  router.use(authMiddleware.optionalAuthenticate);
  router.use(authMiddleware.checkQuota('requests'));

  // Handle all HTTP methods for mock endpoints
  // The * pattern will capture all paths after /mock/
  router.all('/*', authMiddleware.trackUsage, mockServingController.serveMockRequest);

  // Fallback for exact /mock path (edge case)
  router.all('/', authMiddleware.trackUsage, mockServingController.serveMockRequest);

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
