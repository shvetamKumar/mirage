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
import { wrapDatabaseError } from '../utils/database-error';

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
      wrapDatabaseError(error, 'create user');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, role, is_active, is_verified,
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
      wrapDatabaseError(error, 'find user by email');
    }
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, first_name, last_name, role, is_active, is_verified,
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
      wrapDatabaseError(error, 'find user by ID');
    }
  }

  async findByCredentials(email: string): Promise<{ user: User; passwordHash: string } | null> {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, role, is_active, is_verified,
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
      wrapDatabaseError(error, 'find user by credentials');
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
      wrapDatabaseError(error, 'verify email');
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
      wrapDatabaseError(error, 'create API key');
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
      wrapDatabaseError(error, 'find API key');
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

  // Admin methods
  async getAllUsersAdmin(
    limit: number,
    offset: number,
    filters: { role?: string; search?: string } = {}
  ): Promise<{ users: User[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.role) {
      paramCount++;
      whereClause += ` AND role = $${paramCount}`;
      values.push(filters.role);
    }

    if (filters.search) {
      paramCount++;
      whereClause += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
    }

    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const dataQuery = `
      SELECT id, email, first_name, last_name, role, is_active, is_verified,
             created_at, updated_at, last_login_at
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, values.slice(0, -2)),
        this.pool.query(dataQuery, values),
      ]);

      return {
        users: dataResult.rows.map(row => this.mapRowToUser(row)),
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      wrapDatabaseError(error, 'get all users admin');
    }
  }

  async updateUserAdmin(userId: string, updateData: { role?: string; is_active?: boolean }): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updateData.role !== undefined) {
      paramCount++;
      fields.push(`role = $${paramCount}`);
      values.push(updateData.role);
    }

    if (updateData.is_active !== undefined) {
      paramCount++;
      fields.push(`is_active = $${paramCount}`);
      values.push(updateData.is_active);
    }

    if (fields.length === 0) {
      return false;
    }

    paramCount++;
    values.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rowCount! > 0;
    } catch (error) {
      wrapDatabaseError(error, 'update user admin');
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT id, name, description, price_monthly, price_yearly, max_endpoints,
             max_requests_per_month, max_request_delay_ms, features, is_active,
             created_at, updated_at
      FROM subscription_plans
      ORDER BY price_monthly ASC
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price_monthly: parseFloat(row.price_monthly),
        price_yearly: parseFloat(row.price_yearly),
        max_endpoints: row.max_endpoints,
        max_requests_per_month: row.max_requests_per_month,
        max_request_delay_ms: row.max_request_delay_ms,
        features: row.features,
        is_active: row.is_active,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      }));
    } catch (error) {
      wrapDatabaseError(error, 'get all subscription plans');
    }
  }

  async createSubscriptionPlan(planData: {
    name: string;
    description?: string;
    price_monthly: number;
    price_yearly: number;
    max_endpoints: number;
    max_requests_per_month: number;
    max_request_delay_ms: number;
    features?: string[];
  }): Promise<string> {
    const query = `
      INSERT INTO subscription_plans (name, description, price_monthly, price_yearly,
                                     max_endpoints, max_requests_per_month, max_request_delay_ms, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const values = [
      planData.name,
      planData.description || null,
      planData.price_monthly,
      planData.price_yearly,
      planData.max_endpoints,
      planData.max_requests_per_month,
      planData.max_request_delay_ms,
      JSON.stringify(planData.features || []),
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      wrapDatabaseError(error, 'create subscription plan');
    }
  }

  async updateSubscriptionPlan(planId: string, updateData: any): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const allowedFields = [
      'name', 'description', 'price_monthly', 'price_yearly',
      'max_endpoints', 'max_requests_per_month', 'max_request_delay_ms',
      'features', 'is_active'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(field === 'features' ? JSON.stringify(updateData[field]) : updateData[field]);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    paramCount++;
    values.push(planId);

    const query = `
      UPDATE subscription_plans
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rowCount! > 0;
    } catch (error) {
      wrapDatabaseError(error, 'update subscription plan');
    }
  }

  async getAllApiKeysAdmin(
    limit: number,
    offset: number,
    filters: { userId?: string } = {}
  ): Promise<{ apiKeys: (UserApiKey & { user_email: string })[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.userId) {
      paramCount++;
      whereClause += ` AND k.user_id = $${paramCount}`;
      values.push(filters.userId);
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM user_api_keys k
      JOIN users u ON k.user_id = u.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT k.id, k.user_id, k.key_prefix, k.name, k.permissions, k.is_active,
             k.last_used_at, k.expires_at, k.created_at, k.updated_at,
             u.email as user_email
      FROM user_api_keys k
      JOIN users u ON k.user_id = u.id
      ${whereClause}
      ORDER BY k.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query(countQuery, values.slice(0, -2)),
        this.pool.query(dataQuery, values),
      ]);

      return {
        apiKeys: dataResult.rows.map(row => ({
          ...this.mapRowToApiKey(row),
          user_email: row.user_email,
        })),
        total: parseInt(countResult.rows[0].count),
      };
    } catch (error) {
      wrapDatabaseError(error, 'get all api keys admin');
    }
  }

  async deactivateApiKeyAdmin(keyId: string): Promise<{ success: boolean; userId?: string }> {
    const query = `
      UPDATE user_api_keys
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING user_id
    `;

    try {
      const result = await this.pool.query(query, [keyId]);
      if (result.rowCount! > 0) {
        return { success: true, userId: result.rows[0].user_id };
      }
      return { success: false };
    } catch (error) {
      logger.error('Failed to deactivate API key admin', {
        error: error instanceof Error ? error.message : 'Unknown error',
        keyId,
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
      role: (row['role'] as 'user' | 'admin') || 'user',
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
