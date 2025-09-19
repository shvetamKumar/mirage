import { Pool } from 'pg';
import {
  User,
  CreateUserRequest,
  SubscriptionPlan,
  UserSubscription,
  ApiUsage,
  UserApiKey,
  CreateApiKeyRequest,
  UsageStats,
} from '../types/user.types';
import { logger } from '../utils/logger';

export class UserModel {
  constructor(private pool: Pool) {}

  async create(
    data: CreateUserRequest,
    passwordHash: string,
    verificationToken?: string
  ): Promise<string> {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, verification_token)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const values = [
      data.email.toLowerCase(),
      passwordHash,
      data.first_name || null,
      data.last_name || null,
      verificationToken || null,
    ];

    try {
      const result = await this.pool.query(query, values);
      const userId = result.rows[0]?.id as string;

      logger.info('User created', { userId, email: data.email });

      // Create free subscription for new user
      await this.createFreeSubscription(userId);

      return userId;
    } catch (error) {
      logger.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: data.email,
      });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, is_active, is_verified, 
             created_at, updated_at, last_login_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, is_active, is_verified,
             created_at, updated_at, last_login_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw error;
    }
  }

  async findByCredentials(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, is_active, is_verified,
             created_at, updated_at, last_login_at
      FROM users 
      WHERE email = $1 AND is_active = true
    `;

    try {
      const result = await this.pool.query(query, [email.toLowerCase()]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        user: this.mapRowToUser(row),
        passwordHash: row['password_hash'] as string,
      };
    } catch (error) {
      logger.error('Failed to find user by credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [userId]);
    } catch (error) {
      logger.error('Failed to update last login', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      // Don't throw - this is not critical
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    const query = `
      UPDATE users 
      SET is_verified = true, verification_token = NULL
      WHERE verification_token = $1 AND is_active = true
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [token]);
      return result.rowCount! > 0;
    } catch (error) {
      logger.error('Failed to verify email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token,
      });
      throw error;
    }
  }

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const query = `
      SELECT us.*, sp.name, sp.description, sp.price_monthly, sp.price_yearly,
             sp.max_endpoints, sp.max_requests_per_month, sp.max_request_delay_ms,
             sp.features, sp.is_active as plan_is_active, sp.created_at as plan_created_at,
             sp.updated_at as plan_updated_at
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 
        AND us.status = 'active'
        AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
      ORDER BY us.created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUserSubscription(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get user subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async createFreeSubscription(userId: string): Promise<void> {
    const query = `
      INSERT INTO user_subscriptions (user_id, plan_id)
      SELECT $1, id
      FROM subscription_plans 
      WHERE name = 'Free' AND is_active = true
      LIMIT 1
    `;

    try {
      await this.pool.query(query, [userId]);
      logger.info('Free subscription created for user', { userId });
    } catch (error) {
      logger.error('Failed to create free subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async trackApiUsage(
    userId: string,
    endpointId: string | null,
    method: string,
    urlPattern: string,
    statusCode?: number,
    processingTime?: number
  ): Promise<void> {
    const query = `
      INSERT INTO api_usage (user_id, endpoint_id, method, url_pattern, response_status_code, processing_time_ms, date_key)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
    `;

    const values = [
      userId,
      endpointId,
      method,
      urlPattern,
      statusCode || null,
      processingTime || null,
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      logger.error('Failed to track API usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        endpointId,
        method,
        urlPattern,
      });
      // Don't throw - usage tracking failure shouldn't break the API
    }
  }

  async getUserUsageStats(userId: string): Promise<UsageStats> {
    // Get current month's usage (MOCK_ENDPOINT_NOT_FOUND requests are no longer stored)
    const usageQuery = `
      SELECT COUNT(*) as request_count
      FROM api_usage
      WHERE user_id = $1
        AND date_key >= DATE_TRUNC('month', CURRENT_DATE)
        AND date_key < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    `;

    // Get current endpoint count
    const endpointsQuery = `
      SELECT COUNT(*) as endpoint_count
      FROM mock_endpoints
      WHERE user_id = $1 AND is_active = true
    `;

    try {
      const [usageResult, endpointsResult, subscription] = await Promise.all([
        this.pool.query(usageQuery, [userId]),
        this.pool.query(endpointsQuery, [userId]),
        this.getUserSubscription(userId),
      ]);

      const requestCount = parseInt(usageResult.rows[0]?.request_count || '0', 10);
      const endpointCount = parseInt(endpointsResult.rows[0]?.endpoint_count || '0', 10);

      const maxRequests = subscription?.plan?.max_requests_per_month || 10;
      const maxEndpoints = subscription?.plan?.max_endpoints || 10;

      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);

      return {
        current_period_requests: requestCount,
        max_requests: maxRequests,
        requests_remaining: Math.max(0, maxRequests - requestCount),
        current_period_endpoints: endpointCount,
        max_endpoints: maxEndpoints,
        endpoints_remaining: Math.max(0, maxEndpoints - endpointCount),
        period_start: periodStart,
        period_end: periodEnd,
      };
    } catch (error) {
      logger.error('Failed to get user usage stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  async createApiKey(
    userId: string,
    data: CreateApiKeyRequest,
    keyHash: string,
    keyPrefix: string
  ): Promise<string> {
    const query = `
      INSERT INTO user_api_keys (user_id, key_hash, key_prefix, name, permissions, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      userId,
      keyHash,
      keyPrefix,
      data.name,
      JSON.stringify(data.permissions || ['read', 'write']),
      data.expires_at || null,
    ];

    try {
      const result = await this.pool.query(query, values);
      const keyId = result.rows[0]?.id as string;

      logger.info('API key created', { userId, keyId, keyPrefix });

      return keyId;
    } catch (error) {
      logger.error('Failed to create API key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        keyPrefix,
      });
      throw error;
    }
  }

  async findApiKey(keyHash: string): Promise<{ key: UserApiKey; user: User } | null> {
    const query = `
      SELECT ak.*, u.id as user_id, u.email, u.first_name, u.last_name,
             u.is_active as user_is_active, u.is_verified, u.created_at as user_created_at,
             u.updated_at as user_updated_at, u.last_login_at
      FROM user_api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = $1 
        AND ak.is_active = true 
        AND u.is_active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
    `;

    try {
      const result = await this.pool.query(query, [keyHash]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        key: this.mapRowToApiKey(row),
        user: this.mapRowToUser({
          id: row['user_id'],
          email: row['email'],
          first_name: row['first_name'],
          last_name: row['last_name'],
          is_active: row['user_is_active'],
          is_verified: row['is_verified'],
          created_at: row['user_created_at'],
          updated_at: row['user_updated_at'],
          last_login_at: row['last_login_at'],
        }),
      };
    } catch (error) {
      logger.error('Failed to find API key', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    const query = `
      UPDATE user_api_keys
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [keyId]);
    } catch (error) {
      logger.error('Failed to update API key last used', {
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId,
      });
      // Don't throw - this is not critical
    }
  }

  async deactivateApiKey(keyId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE user_api_keys
      SET is_active = false
      WHERE id = $1 AND user_id = $2 AND is_active = true
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [keyId, userId]);
      const success = result.rowCount! > 0;

      if (success) {
        logger.info('API key deactivated', { keyId, userId });
      }

      return success;
    } catch (error) {
      logger.error('Failed to deactivate API key', {
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId,
        userId,
      });
      throw error;
    }
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    return {
      id: row['id'] as string,
      email: row['email'] as string,
      first_name: row['first_name'] as string | undefined,
      last_name: row['last_name'] as string | undefined,
      is_active: row['is_active'] as boolean,
      is_verified: row['is_verified'] as boolean,
      created_at: new Date(row['created_at'] as string),
      updated_at: new Date(row['updated_at'] as string),
      last_login_at: row['last_login_at'] ? new Date(row['last_login_at'] as string) : undefined,
    };
  }

  private mapRowToUserSubscription(row: Record<string, unknown>): UserSubscription {
    return {
      id: row['id'] as string,
      user_id: row['user_id'] as string,
      plan_id: row['plan_id'] as string,
      status: row['status'] as UserSubscription['status'],
      started_at: new Date(row['started_at'] as string),
      expires_at: row['expires_at'] ? new Date(row['expires_at'] as string) : undefined,
      canceled_at: row['canceled_at'] ? new Date(row['canceled_at'] as string) : undefined,
      created_at: new Date(row['created_at'] as string),
      updated_at: new Date(row['updated_at'] as string),
      plan: {
        id: row['plan_id'] as string,
        name: row['name'] as string,
        description: row['description'] as string | undefined,
        price_monthly: parseFloat(row['price_monthly'] as string),
        price_yearly: parseFloat(row['price_yearly'] as string),
        max_endpoints: row['max_endpoints'] as number,
        max_requests_per_month: row['max_requests_per_month'] as number,
        max_request_delay_ms: row['max_request_delay_ms'] as number,
        features: row['features'] as string[],
        is_active: row['plan_is_active'] as boolean,
        created_at: new Date(row['plan_created_at'] as string),
        updated_at: new Date(row['plan_updated_at'] as string),
      },
    };
  }

  private mapRowToApiKey(row: Record<string, unknown>): UserApiKey {
    return {
      id: row['id'] as string,
      user_id: row['user_id'] as string,
      key_prefix: row['key_prefix'] as string,
      name: row['name'] as string,
      permissions: row['permissions'] as string[],
      is_active: row['is_active'] as boolean,
      last_used_at: row['last_used_at'] ? new Date(row['last_used_at'] as string) : undefined,
      expires_at: row['expires_at'] ? new Date(row['expires_at'] as string) : undefined,
      created_at: new Date(row['created_at'] as string),
      updated_at: new Date(row['updated_at'] as string),
    };
  }
}
