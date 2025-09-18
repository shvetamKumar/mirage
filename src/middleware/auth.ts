import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AuthUtils } from '../utils/auth';
import { UserModel } from '../models/user.model';
import { DatabaseConnection } from '../database/connection';
import { AppError } from './error-handler';
import { logger } from '../utils/logger';

export class AuthMiddleware {
  private userModel: UserModel;

  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userModel = new UserModel(db.getPool());
  }

  // JWT Authentication middleware
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
      }

      // Check if it's an API key (starts with 'mk_')
      if (token.startsWith('mk_')) {
        await this.authenticateApiKey(req, token);
      } else {
        await this.authenticateJWT(req, token);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        logger.error('Authentication error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
        });
        next(new AppError('Authentication failed', StatusCodes.UNAUTHORIZED, 'AUTH_FAILED'));
      }
    }
  };

  // Optional authentication - doesn't fail if no token provided
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = AuthUtils.extractTokenFromHeader(authHeader);

      if (token) {
        if (token.startsWith('mk_')) {
          await this.authenticateApiKey(req, token);
        } else {
          await this.authenticateJWT(req, token);
        }
      }

      next();
    } catch (error) {
      // For optional auth, log but don't fail
      logger.warn('Optional authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      });
      next();
    }
  };

  // Check if user has required permissions
  requirePermissions = (requiredPermissions: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED'));
        return;
      }

      // Check if user came from API key with specific permissions
      const userPermissions = ((req as any).apiKeyPermissions as string[]) || ['read', 'write'];

      const hasPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermissions) {
        next(
          new AppError(
            'Insufficient permissions',
            StatusCodes.FORBIDDEN,
            'INSUFFICIENT_PERMISSIONS',
            {
              required: requiredPermissions,
              available: userPermissions,
            }
          )
        );
        return;
      }

      next();
    };
  };

  // Check usage quotas with optional exemptions
  checkQuota = (quotaType: 'requests' | 'endpoints', options: { exempt?: boolean } = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Skip quota check if exempted
      if (options.exempt) {
        next();
        return;
      }
      try {
        // If user is not authenticated, require authentication for quota-enforced endpoints
        if (!req.user) {
          next(
            new AppError(
              'Authentication required to access mock endpoints',
              StatusCodes.UNAUTHORIZED,
              'AUTH_REQUIRED',
              {
                message: 'Please provide a valid API key or JWT token to use mock endpoints',
                quota_type: quotaType,
              }
            )
          );
          return;
        }

        const usageStats = await this.userModel.getUserUsageStats(req.user.id);

        let hasQuota = true;
        let quotaError = '';

        if (quotaType === 'requests') {
          hasQuota = usageStats.requests_remaining > 0;
          quotaError = `Monthly request limit exceeded (${usageStats.max_requests} requests)`;
        } else if (quotaType === 'endpoints') {
          hasQuota = usageStats.endpoints_remaining > 0;
          quotaError = `Endpoint limit exceeded (${usageStats.max_endpoints} endpoints)`;
        }

        if (!hasQuota) {
          next(
            new AppError(quotaError, StatusCodes.TOO_MANY_REQUESTS, 'QUOTA_EXCEEDED', {
              quota_type: quotaType,
              usage_stats: usageStats,
              upgrade_url: '/api/v1/subscription/plans',
            })
          );
          return;
        }

        next();
      } catch (error) {
        logger.error('Quota check error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: req.user?.id,
          quotaType,
        });
        next(error);
      }
    };
  };

  private async authenticateJWT(req: Request, token: string): Promise<void> {
    try {
      const payload = AuthUtils.verifyToken(token);

      const user = await this.userModel.findById(payload.user_id);
      if (!user) {
        throw new AppError('User not found', StatusCodes.UNAUTHORIZED, 'USER_NOT_FOUND');
      }

      if (!user.is_active) {
        throw new AppError('User account is inactive', StatusCodes.UNAUTHORIZED, 'USER_INACTIVE');
      }

      // Get user subscription
      const subscription = await this.userModel.getUserSubscription(user.id);

      req.user = user;
      req.subscription = subscription || undefined;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Invalid token', StatusCodes.UNAUTHORIZED, 'INVALID_TOKEN');
    }
  }

  private async authenticateApiKey(req: Request, apiKey: string): Promise<void> {
    try {
      const keyHash = AuthUtils.hashApiKey(apiKey);

      const result = await this.userModel.findApiKey(keyHash);
      if (!result) {
        throw new AppError('Invalid API key', StatusCodes.UNAUTHORIZED, 'INVALID_API_KEY');
      }

      const { key, user } = result;

      if (!user.is_active) {
        throw new AppError('User account is inactive', StatusCodes.UNAUTHORIZED, 'USER_INACTIVE');
      }

      // Update last used timestamp (fire and forget)
      this.userModel.updateApiKeyLastUsed(key.id).catch(() => {});

      // Get user subscription
      const subscription = await this.userModel.getUserSubscription(user.id);

      req.user = user;
      req.subscription = subscription || undefined;
      (req as any).apiKeyPermissions = key.permissions;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'API key authentication failed',
        StatusCodes.UNAUTHORIZED,
        'API_KEY_AUTH_FAILED'
      );
    }
  }

  // Middleware to ensure email is verified
  requireVerified = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED'));
      return;
    }

    // Skip email verification if SKIP_EMAIL_VERIFICATION is enabled (development mode)
    const skipVerification = process.env.SKIP_EMAIL_VERIFICATION === 'true';

    if (!req.user.is_verified && !skipVerification) {
      next(
        new AppError('Email verification required', StatusCodes.FORBIDDEN, 'EMAIL_NOT_VERIFIED', {
          message: 'Please verify your email address to access this feature',
          verification_url: '/api/v1/auth/resend-verification',
        })
      );
      return;
    }

    next();
  };

  // Quota-exempt middleware for account management operations
  checkQuotaExempt = () => {
    return this.checkQuota('requests', { exempt: true });
  };

  // Track API usage after successful request
  trackUsage = (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function (data) {
      const processingTime = Date.now() - startTime;

      if (req.user) {
        // Extract endpoint ID if available
        const endpointId = (req as any).endpointId || null;
        const urlPattern = req.route?.path || req.path;

        // Fire and forget usage tracking
        const userModel = new UserModel(DatabaseConnection.getInstance().getPool());
        userModel
          .trackApiUsage(
            req.user.id,
            endpointId,
            req.method,
            urlPattern,
            res.statusCode,
            processingTime
          )
          .catch(() => {});
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();
