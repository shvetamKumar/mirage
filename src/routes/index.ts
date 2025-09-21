import { Router } from 'express';
import { MockEndpointController } from '../controllers/mock-endpoint.controller';
import { MockServingController } from '../controllers/mock-serving.controller';
import { createMockEndpointRoutes } from './mock-endpoint.routes';
import { createMockServingRoutes, createUtilityRoutes } from './mock-serving.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';

export function createRoutes(
  mockEndpointController: MockEndpointController,
  mockServingController: MockServingController
): Router {
  const router = Router();

  // Authentication routes
  router.use('/api/v1/auth', authRoutes);

  // Admin routes (requires admin role)
  router.use('/api/v1/admin', adminRoutes);

  // API routes for managing mock endpoints
  router.use('/api/v1/mock-endpoints', createMockEndpointRoutes(mockEndpointController));

  // Mock serving routes - these handle the actual mock responses
  router.use('/mock', createMockServingRoutes(mockServingController));

  // Utility routes (health, metrics, debug)
  router.use('/', createUtilityRoutes(mockServingController));

  return router;
}
