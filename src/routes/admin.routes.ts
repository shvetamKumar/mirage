import { Router } from 'express';
import { adminController, AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireAdmin);

// Admin dashboard
router.get('/dashboard', authMiddleware.checkQuotaExempt(), adminController.getAdminDashboard);

// User management
router.get(
  '/users',
  authMiddleware.checkQuotaExempt(),
  AdminController.getUsersValidation,
  adminController.getUsers
);

router.get('/users/:userId', authMiddleware.checkQuotaExempt(), adminController.getUserDetails);

router.patch(
  '/users/:userId',
  authMiddleware.checkQuotaExempt(),
  csrfProtection,
  adminController.updateUser
);

// Subscription plan management
router.get('/subscription-plans', authMiddleware.checkQuotaExempt(), adminController.getSubscriptionPlans);

router.post(
  '/subscription-plans',
  authMiddleware.checkQuotaExempt(),
  csrfProtection,
  AdminController.subscriptionPlanValidation,
  adminController.createSubscriptionPlan
);

router.patch(
  '/subscription-plans/:planId',
  authMiddleware.checkQuotaExempt(),
  csrfProtection,
  AdminController.subscriptionPlanValidation,
  adminController.updateSubscriptionPlan
);

// API key management
router.get(
  '/api-keys',
  authMiddleware.checkQuotaExempt(),
  AdminController.getApiKeysValidation,
  adminController.getAllApiKeys
);

router.delete(
  '/api-keys/:keyId',
  authMiddleware.checkQuotaExempt(),
  csrfProtection,
  adminController.deactivateApiKey
);

// System statistics
router.get('/stats', authMiddleware.checkQuotaExempt(), adminController.getUsageStats);

export default router;