import { Pool } from 'pg';
import { UserModel } from '../models/user.model';
import { AuthUtils } from '../utils/auth';
import { DatabaseConnection } from '../database/connection';
import { AppError } from '../middleware/error-handler';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import {
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  User,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UserDashboard,
  VerifyEmailRequest,
} from '../types/user.types';

export class UserService {
  private userModel: UserModel;

  constructor(pool?: Pool) {
    const db = pool || DatabaseConnection.getInstance().getPool();
    this.userModel = new UserModel(db);
  }

  async register(data: CreateUserRequest): Promise<{ user: User; message: string }> {
    const { email, password, first_name, last_name } = data;

    // Validate email format
    if (!AuthUtils.validateEmail(email)) {
      throw new AppError('Invalid email format', StatusCodes.BAD_REQUEST, 'INVALID_EMAIL');
    }

    // Validate password strength
    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new AppError('Password validation failed', StatusCodes.BAD_REQUEST, 'WEAK_PASSWORD', {
        errors: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(email);
    if (existingUser) {
      throw new AppError(
        'User with this email already exists',
        StatusCodes.CONFLICT,
        'USER_EXISTS'
      );
    }

    try {
      // Hash password and generate verification token
      const passwordHash = await AuthUtils.hashPassword(password);
      const verificationToken = AuthUtils.generateVerificationToken();

      // Create user
      const userId = await this.userModel.create(
        { email, password, first_name: first_name || undefined, last_name: last_name || undefined },
        passwordHash,
        verificationToken
      );

      // Get created user
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new AppError(
          'Failed to retrieve created user',
          StatusCodes.INTERNAL_SERVER_ERROR,
          'USER_CREATION_FAILED'
        );
      }

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
      });

      // TODO: Send verification email with verificationToken
      // For now, we'll auto-verify users in development

      return {
        user,
        message: 'Registration successful. Please check your email for verification instructions.',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });

      throw new AppError(
        'Registration failed',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'REGISTRATION_FAILED'
      );
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, password } = data;

    try {
      // Find user with password hash
      const result = await this.userModel.findByCredentials(email);
      if (!result) {
        throw new AppError(
          'Invalid email or password',
          StatusCodes.UNAUTHORIZED,
          'INVALID_CREDENTIALS'
        );
      }

      const { user, passwordHash } = result;

      // Verify password
      const isValidPassword = await AuthUtils.comparePassword(password, passwordHash);
      if (!isValidPassword) {
        throw new AppError(
          'Invalid email or password',
          StatusCodes.UNAUTHORIZED,
          'INVALID_CREDENTIALS'
        );
      }

      // Update last login time
      await this.userModel.updateLastLogin(user.id);

      // Generate JWT token
      const token = AuthUtils.generateToken({
        user_id: user.id,
        email: user.email,
      });

      const expirationTime = AuthUtils.getTokenExpirationTime();

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        user,
        token,
        expires_in: expirationTime,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });

      throw new AppError('Login failed', StatusCodes.INTERNAL_SERVER_ERROR, 'LOGIN_FAILED');
    }
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<{ message: string }> {
    const { token } = data;

    try {
      const success = await this.userModel.verifyEmail(token);

      if (!success) {
        throw new AppError(
          'Invalid or expired verification token',
          StatusCodes.BAD_REQUEST,
          'INVALID_VERIFICATION_TOKEN'
        );
      }

      logger.info('Email verified successfully', { token });

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      });

      throw new AppError(
        'Email verification failed',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'VERIFICATION_FAILED'
      );
    }
  }

  async createApiKey(userId: string, data: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    try {
      // Generate API key
      const { key, keyHash, keyPrefix } = AuthUtils.generateApiKey();

      // Create API key record
      const keyId = await this.userModel.createApiKey(userId, data, keyHash, keyPrefix);

      logger.info('API key created', {
        userId,
        keyId,
        keyPrefix,
      });

      return {
        id: keyId,
        key, // Full key only returned once
        message:
          'API key created successfully. Store this key safely as it cannot be retrieved again.',
      };
    } catch (error) {
      logger.error('API key creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      throw new AppError(
        'Failed to create API key',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'API_KEY_CREATION_FAILED'
      );
    }
  }

  async deactivateApiKey(
    userId: string,
    keyId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.userModel.deactivateApiKey(keyId, userId);

      if (!success) {
        throw new AppError(
          'API key not found or already inactive',
          StatusCodes.NOT_FOUND,
          'API_KEY_NOT_FOUND'
        );
      }

      return {
        success: true,
        message: 'API key deactivated successfully',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to deactivate API key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        keyId,
      });

      throw new AppError(
        'Failed to deactivate API key',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'API_KEY_DEACTIVATION_FAILED'
      );
    }
  }

  async getUserDashboard(userId: string): Promise<UserDashboard> {
    try {
      const [user, subscription, usageStats] = await Promise.all([
        this.userModel.findById(userId),
        this.userModel.getUserSubscription(userId),
        this.userModel.getUserUsageStats(userId),
      ]);

      if (!user) {
        throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
      }

      // Get recent API usage (last 30 days) with endpoint names
      const recentUsageQuery = `
        SELECT au.endpoint_id, au.method, au.url_pattern, au.response_status_code,
               au.processing_time_ms, au.created_at, au.date_key,
               me.name as endpoint_name, me.description as endpoint_description
        FROM api_usage au
        LEFT JOIN mock_endpoints me ON au.endpoint_id = me.id
        WHERE au.user_id = $1
          AND au.created_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY au.created_at DESC
        LIMIT 100
      `;

      // Get user API keys
      const apiKeysQuery = `
        SELECT id, key_prefix, name, permissions, is_active, 
               last_used_at, expires_at, created_at, updated_at
        FROM user_api_keys 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const db = DatabaseConnection.getInstance().getPool();
      const [recentUsageResult, apiKeysResult] = await Promise.all([
        db.query(recentUsageQuery, [userId]),
        db.query(apiKeysQuery, [userId]),
      ]);

      const recentUsage = recentUsageResult.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        endpoint_id: row.endpoint_id,
        endpoint_name: row.endpoint_name,
        endpoint_description: row.endpoint_description,
        method: row.method,
        url_pattern: row.url_pattern,
        response_status_code: row.response_status_code,
        processing_time_ms: row.processing_time_ms,
        created_at: new Date(row.created_at),
        date_key: new Date(row.date_key),
      }));

      const apiKeys = apiKeysResult.rows.map(row => ({
        id: row.id,
        user_id: userId,
        key_prefix: row.key_prefix,
        name: row.name,
        permissions: row.permissions,
        is_active: row.is_active,
        last_used_at: row.last_used_at ? new Date(row.last_used_at) : undefined,
        expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));

      return {
        user,
        subscription: subscription || undefined,
        usage_stats: usageStats,
        recent_usage: recentUsage,
        api_keys: apiKeys,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Failed to get user dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });

      throw new AppError(
        'Failed to load dashboard',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'DASHBOARD_LOAD_FAILED'
      );
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', StatusCodes.NOT_FOUND, 'USER_NOT_FOUND');
      }
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'Failed to retrieve user',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'USER_RETRIEVAL_FAILED'
      );
    }
  }
}
