import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import { UserModel } from '../models/user.model';
import { DatabaseConnection } from '../database/connection';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import {
  User,
  SubscriptionPlan,
  UserSubscription,
  UserApiKey,
  ApiUsage,
  UsageStats,
} from '../types/user.types';

export class AdminController {
  private userModel: UserModel;

  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userModel = new UserModel(db.getPool());
  }

  // Validation rules for subscription plan creation/update
  static subscriptionPlanValidation = [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('Plan name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    body('price_monthly')
      .isFloat({ min: 0 })
      .withMessage('Monthly price must be a positive number'),
    body('price_yearly')
      .isFloat({ min: 0 })
      .withMessage('Yearly price must be a positive number'),
    body('max_endpoints')
      .isInt({ min: 1 })
      .withMessage('Max endpoints must be a positive integer'),
    body('max_requests_per_month')
      .isInt({ min: 1 })
      .withMessage('Max requests per month must be a positive integer'),
    body('max_request_delay_ms')
      .isInt({ min: 0 })
      .withMessage('Max request delay must be a non-negative integer'),
    body('features')
      .optional()
      .isArray()
      .withMessage('Features must be an array'),
  ];

  // Get admin dashboard with system statistics
  getAdminDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.getSystemStats();

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          system_stats: stats,
          admin_user: {
            id: req.user!.id,
            email: req.user!.email,
            role: req.user!.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get all users with pagination and filtering
  getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;
      const role = req.query.role as string;
      const search = req.query.search as string;

      const result = await this.userModel.getAllUsersAdmin(limit, offset, { role, search });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            total: result.total,
            page,
            limit,
            total_pages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get user details with subscription and usage
  getUserDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        next(new AppError('User ID is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        next(new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND'));
        return;
      }

      const subscription = await this.userModel.getUserSubscription(userId);
      const usageStats = await this.userModel.getUserUsageStats(userId);
      // TODO: Add getUserApiKeys and getRecentUsage methods
      const apiKeys: any[] = [];
      const recentUsage: any[] = [];

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          user,
          subscription,
          usage_stats: usageStats,
          api_keys: apiKeys,
          recent_usage: recentUsage,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update user role or status
  updateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role, is_active } = req.body;

      if (!userId) {
        next(new AppError('User ID is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      const updateData: any = {};
      if (role !== undefined) {
        if (!['user', 'admin'].includes(role)) {
          next(new AppError('Invalid role', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
          return;
        }
        updateData.role = role;
      }

      if (is_active !== undefined) {
        updateData.is_active = Boolean(is_active);
      }

      if (Object.keys(updateData).length === 0) {
        next(new AppError('No valid fields to update', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      const updated = await this.userModel.updateUserAdmin(userId, updateData);
      if (!updated) {
        next(new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND'));
        return;
      }

      logger.info('User updated by admin', {
        adminUserId: req.user!.id,
        targetUserId: userId,
        updateData,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'User updated successfully',
        data: { userId, updates: updateData },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get all subscription plans
  getSubscriptionPlans = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = await this.userModel.getAllSubscriptionPlans();

      res.status(StatusCodes.OK).json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      next(error);
    }
  };

  // Create new subscription plan
  createSubscriptionPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const planData = req.body;
      const planId = await this.userModel.createSubscriptionPlan(planData);

      logger.info('Subscription plan created by admin', {
        adminUserId: req.user!.id,
        planId,
        planData,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: { planId },
      });
    } catch (error) {
      next(error);
    }
  };

  // Update subscription plan
  updateSubscriptionPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const { planId } = req.params;
      const updateData = req.body;

      if (!planId) {
        next(new AppError('Plan ID is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      const updated = await this.userModel.updateSubscriptionPlan(planId, updateData);
      if (!updated) {
        next(new AppError('Subscription plan not found', StatusCodes.NOT_FOUND, 'PLAN_NOT_FOUND'));
        return;
      }

      logger.info('Subscription plan updated by admin', {
        adminUserId: req.user!.id,
        planId,
        updateData,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: { planId },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get all API keys across all users
  getAllApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;
      const userId = req.query.userId as string;

      const result = await this.userModel.getAllApiKeysAdmin(limit, offset, { userId });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          api_keys: result.apiKeys,
          pagination: {
            total: result.total,
            page,
            limit,
            total_pages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // Deactivate any user's API key
  deactivateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;

      if (!keyId) {
        next(new AppError('API key ID is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      const result = await this.userModel.deactivateApiKeyAdmin(keyId);
      if (!result.success) {
        next(new AppError('API key not found', StatusCodes.NOT_FOUND, 'API_KEY_NOT_FOUND'));
        return;
      }

      logger.info('API key deactivated by admin', {
        adminUserId: req.user!.id,
        keyId,
        keyUserId: result.userId,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'API key deactivated successfully',
        data: { keyId },
      });
    } catch (error) {
      next(error);
    }
  };

  // Get system usage statistics
  getUsageStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.getSystemStats();

      res.status(StatusCodes.OK).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };

  // Private helper method to get system statistics
  private async getSystemStats(): Promise<any> {
    const pool = DatabaseConnection.getInstance().getPool();

    const [
      userStats,
      subscriptionStats,
      apiKeyStats,
      usageStats,
      recentActivity,
    ] = await Promise.all([
      // User statistics
      pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
          COUNT(*) FILTER (WHERE is_verified = true) as verified_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_this_month
        FROM users
      `),
      // Subscription statistics
      pool.query(`
        SELECT
          sp.name,
          COUNT(us.id) as active_subscriptions
        FROM subscription_plans sp
        LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
        GROUP BY sp.id, sp.name
        ORDER BY sp.name
      `),
      // API key statistics
      pool.query(`
        SELECT
          COUNT(*) as total_api_keys,
          COUNT(*) FILTER (WHERE is_active = true) as active_api_keys,
          COUNT(*) FILTER (WHERE last_used_at >= CURRENT_DATE - INTERVAL '30 days') as keys_used_this_month
        FROM user_api_keys
      `),
      // Usage statistics
      pool.query(`
        SELECT
          COUNT(*) as total_requests_this_month,
          COUNT(DISTINCT user_id) as active_users_this_month,
          AVG(processing_time_ms) as avg_processing_time
        FROM api_usage
        WHERE date_key >= CURRENT_DATE - INTERVAL '30 days'
      `),
      // Recent activity
      pool.query(`
        SELECT
          u.email,
          au.method,
          au.url_pattern,
          au.response_status_code,
          au.created_at
        FROM api_usage au
        JOIN users u ON au.user_id = u.id
        ORDER BY au.created_at DESC
        LIMIT 10
      `),
    ]);

    return {
      users: userStats.rows[0],
      subscriptions: subscriptionStats.rows,
      api_keys: apiKeyStats.rows[0],
      usage: usageStats.rows[0],
      recent_activity: recentActivity.rows,
    };
  }

  // Validation for user queries
  static getUsersValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search term too long'),
  ];

  // Validation for API key queries
  static getApiKeysValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  ];
}

export const adminController = new AdminController();