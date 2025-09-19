import { Router } from 'express';
import { authController, AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.registerValidation, authController.register);

router.post('/login', AuthController.loginValidation, authController.login);

router.post('/verify-email', AuthController.verifyEmailValidation, authController.verifyEmail);

// Protected routes (require authentication) - Account management exempt from quotas
router.get('/profile', authMiddleware.authenticate, authMiddleware.checkQuotaExempt(), authController.getProfile);

router.get('/dashboard', authMiddleware.authenticate, authMiddleware.checkQuotaExempt(), authController.getDashboard);

router.post(
  '/api-keys',
  authMiddleware.authenticate,
  authMiddleware.requireVerified,
  authMiddleware.checkQuotaExempt(),
  AuthController.createApiKeyValidation,
  authController.createApiKey
);

router.delete(
  '/api-keys/:keyId',
  authMiddleware.authenticate,
  authMiddleware.requireVerified,
  authMiddleware.checkQuotaExempt(),
  authController.deactivateApiKey
);

export default router;
