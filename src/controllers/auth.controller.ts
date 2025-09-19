import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import { UserService } from '../services/user.service';
import { AppError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { tokenBlacklist } from '../utils/token-blacklist';
import { AuthUtils } from '../utils/auth';
import {
  CreateUserRequest,
  LoginRequest,
  VerifyEmailRequest,
  CreateApiKeyRequest,
} from '../types/user.types';

export class AuthController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Validation rules for registration
  static registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('first_name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('last_name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
  ];

  // Validation rules for login
  static loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  // Validation rules for email verification
  static verifyEmailValidation = [
    body('token').isLength({ min: 1 }).withMessage('Verification token is required'),
  ];

  // Validation rules for API key creation
  static createApiKeyValidation = [
    body('name')
      .isLength({ min: 1, max: 100 })
      .withMessage('API key name must be between 1 and 100 characters'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .isIn(['read', 'write', 'admin'])
      .withMessage('Invalid permission. Must be one of: read, write, admin'),
    body('expires_at')
      .optional()
      .isISO8601()
      .withMessage('Expiration date must be a valid ISO 8601 date'),
  ];

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const userData: CreateUserRequest = req.body;
      const result = await this.userService.register(userData);

      logger.info('User registration successful', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: result.message,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            is_verified: result.user.is_verified,
            created_at: result.user.created_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const loginData: LoginRequest = req.body;
      const result = await this.userService.login(loginData);

      logger.info('User login successful', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            is_verified: result.user.is_verified,
            last_login_at: result.user.last_login_at,
          },
          token: result.token,
          expires_in: result.expires_in,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      const verificationData: VerifyEmailRequest = req.body;
      const result = await this.userService.verifyEmail(verificationData);

      logger.info('Email verification successful', {
        token: verificationData.token,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };

  createApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        next(
          new AppError('Validation failed', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', {
            errors: errors.array(),
          })
        );
        return;
      }

      if (!(req as any).user) {
        next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED'));
        return;
      }

      const apiKeyData: CreateApiKeyRequest = req.body;

      // Convert expires_at string to Date if provided
      if (apiKeyData.expires_at && typeof apiKeyData.expires_at === 'string') {
        apiKeyData.expires_at = new Date(apiKeyData.expires_at);
      }

      const result = await this.userService.createApiKey((req as any).user.id, apiKeyData);

      logger.info('API key created successfully', {
        userId: (req as any).user.id,
        keyId: result.id,
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: result.message,
        data: {
          id: result.id,
          key: result.key,
          warning: 'Store this API key safely. It cannot be retrieved again.',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED'));
        return;
      }

      const user = await this.userService.getUserById((req as any).user.id);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_verified: user.is_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login_at: user.last_login_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(req as any).user) {
        next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED'));
        return;
      }

      const dashboard = await this.userService.getUserDashboard((req as any).user.id);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          user: {
            id: dashboard.user.id,
            email: dashboard.user.email,
            first_name: dashboard.user.first_name,
            last_name: dashboard.user.last_name,
            is_verified: dashboard.user.is_verified,
            created_at: dashboard.user.created_at,
            updated_at: dashboard.user.updated_at,
            last_login_at: dashboard.user.last_login_at,
          },
          subscription: dashboard.subscription,
          usage_stats: dashboard.usage_stats,
          recent_usage: dashboard.recent_usage,
          api_keys: dashboard.api_keys.map(key => ({
            id: key.id,
            key_prefix: key.key_prefix,
            name: key.name,
            permissions: key.permissions,
            is_active: key.is_active,
            last_used_at: key.last_used_at,
            expires_at: key.expires_at,
            created_at: key.created_at,
            updated_at: key.updated_at,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  deactivateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { keyId } = req.params;
      const userId = (req as any).user?.id;

      if (!keyId) {
        next(new AppError('API key ID is required', StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR'));
        return;
      }

      logger.info('Deactivating API key', { keyId, userId });

      const result = await this.userService.deactivateApiKey(userId, keyId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: result.message,
        data: {
          keyId,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AppError('No token provided', StatusCodes.BAD_REQUEST, 'NO_TOKEN');
      }

      // Verify and extract token ID
      const payload = AuthUtils.verifyToken(token);

      // Add token to blacklist
      tokenBlacklist.revokeToken(payload.jti);

      logger.info('User logged out', { userId: payload.user_id });

      res.status(StatusCodes.OK).json({
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
