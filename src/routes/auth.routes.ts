import { Router } from 'express';
import { authController, AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.registerValidation, authController.register);

router.post('/login', AuthController.loginValidation, authController.login);

router.post('/verify-email', AuthController.verifyEmailValidation, authController.verifyEmail);

// Protected routes (require authentication)
router.get('/profile', authMiddleware.authenticate, authController.getProfile);

router.get('/dashboard', authMiddleware.authenticate, authController.getDashboard);

router.post(
  '/api-keys',
  authMiddleware.authenticate,
  authMiddleware.requireVerified,
  AuthController.createApiKeyValidation,
  authController.createApiKey
);

export default router;
