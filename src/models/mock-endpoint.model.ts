import { Pool } from 'pg';
import {
  MockEndpoint,
  CreateMockEndpointRequest,
  UpdateMockEndpointRequest,
  MockEndpointListQuery,
  MockEndpointRow,
  CountResult,
  QueryResult,
} from '../types';
import { logger } from '../utils/logger';

export class MockEndpointModel {
  constructor(private pool: Pool) {}

  async create(data: CreateMockEndpointRequest, userId: string): Promise<string> {
    const query = `
      INSERT INTO mock_endpoints (
        name, description, method, url_pattern, request_schema, 
        response_data, response_status_code, response_delay_ms, created_by, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const values = [
      data.name,
      data.description || null,
      data.method,
      data.url_pattern,
      data.request_schema || null,
      data.response_data,
      data.response_status_code || 200,
      data.response_delay_ms || 0,
      data.created_by || null,
      userId,
    ];

    try {
      const result: QueryResult<MockEndpointRow> = await this.pool.query(query, values);
      const id = result.rows[0]?.id;

      if (!id) {
        throw new Error('Failed to get created endpoint ID');
      }

      logger.info('Mock endpoint created', {
        id,
        userId,
        name: data.name,
        method: data.method,
        url_pattern: data.url_pattern,
      });

      return id;
    } catch (error) {
      logger.error('Failed to create mock endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
        userId,
      });
      throw error;
    }
  }

  async findById(id: string, userId?: string): Promise<MockEndpoint | null> {
    let query = `
      SELECT * FROM mock_endpoints 
      WHERE id = $1
    `;
    const values = [id];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    try {
      const result: QueryResult<MockEndpointRow> = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMockEndpoint(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find mock endpoint by ID', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        userId,
      });
      throw error;
    }
  }

  async findMany(
    filters: MockEndpointListQuery,
    userId?: string
  ): Promise<{ endpoints: MockEndpoint[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    // Always filter by user_id if provided
    if (userId) {
      conditions.push(`user_id = $${paramCounter}`);
      values.push(userId);
      paramCounter++;
    }

    // Build WHERE clause
    if (filters.is_active !== undefined) {
      conditions.push(`is_active = $${paramCounter}`);
      values.push(filters.is_active);
      paramCounter++;
    }

    if (filters.method) {
      conditions.push(`method = $${paramCounter}`);
      values.push(filters.method);
      paramCounter++;
    }

    if (filters.search) {
      conditions.push(`(name ILIKE $${paramCounter} OR url_pattern ILIKE $${paramCounter})`);
      values.push(`%${filters.search}%`);
      paramCounter++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM mock_endpoints 
      ${whereClause}
    `;

    // Data query with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dataQuery = `
      SELECT * FROM mock_endpoints 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    const dataValues = [...values, limit, offset];

    try {
      const [countResult, dataResult] = await Promise.all([
        this.pool.query<CountResult>(countQuery, values),
        this.pool.query<MockEndpointRow>(dataQuery, dataValues),
      ]);

      const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
      const endpoints = dataResult.rows.map(row => this.mapRowToMockEndpoint(row));

      return { endpoints, total };
    } catch (error) {
      logger.error('Failed to find mock endpoints', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters,
      });
      throw error;
    }
  }

  async update(id: string, data: UpdateMockEndpointRequest, userId?: string): Promise<boolean> {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    // Build SET clause dynamically based on provided fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    });

    if (updateFields.length === 0) {
      return false;
    }

    // Allow updating is_active field on inactive endpoints
    const isActivatingEndpoint = data.is_active === true;
    let query = `
      UPDATE mock_endpoints
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}${isActivatingEndpoint ? '' : ' AND is_active = true'}
    `;
    values.push(id);

    if (userId) {
      paramCounter++;
      query += ` AND user_id = $${paramCounter}`;
      values.push(userId);
    }

    query += ' RETURNING id';

    try {
      const result = await this.pool.query(query, values);
      const updated = (result.rowCount ?? 0) > 0;

      if (updated) {
        logger.info('Mock endpoint updated', { id, updatedFields: Object.keys(data) });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update mock endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        data,
      });
      throw error;
    }
  }

  async softDelete(id: string, userId?: string): Promise<boolean> {
    let query = `
      UPDATE mock_endpoints 
      SET is_active = false 
      WHERE id = $1 AND is_active = true
    `;
    const values = [id];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    query += ' RETURNING id';

    try {
      const result = await this.pool.query(query, values);
      const deleted = (result.rowCount ?? 0) > 0;

      if (deleted) {
        logger.info('Mock endpoint soft deleted', { id, userId });
      }

      return deleted;
    } catch (error) {
      logger.error('Failed to soft delete mock endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
      });
      throw error;
    }
  }

  async findByMethodAndPattern(
    method: string,
    urlPattern: string,
    userId?: string
  ): Promise<MockEndpoint | null> {
    let query = `
      SELECT * FROM mock_endpoints 
      WHERE method = $1 AND url_pattern = $2 AND is_active = true
    `;
    const values = [method, urlPattern];

    if (userId) {
      query += ' AND user_id = $3';
      values.push(userId);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    try {
      const result: QueryResult<MockEndpointRow> = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMockEndpoint(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find mock endpoint by method and pattern', {
        error: error instanceof Error ? error.message : 'Unknown error',
        method,
        urlPattern,
        userId,
      });
      throw error;
    }
  }

  async findMatchingEndpoints(method: string): Promise<MockEndpoint[]> {
    const query = `
      SELECT * FROM mock_endpoints 
      WHERE method = $1 AND is_active = true
      ORDER BY LENGTH(url_pattern) DESC, created_at DESC
    `;

    try {
      const result: QueryResult<MockEndpointRow> = await this.pool.query(query, [method]);
      return result.rows.map(row => this.mapRowToMockEndpoint(row));
    } catch (error) {
      logger.error('Failed to find matching endpoints', {
        error: error instanceof Error ? error.message : 'Unknown error',
        method,
      });
      throw error;
    }
  }

  private mapRowToMockEndpoint(row: MockEndpointRow): MockEndpoint {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      method: row.method,
      url_pattern: row.url_pattern,
      request_schema: row.request_schema ?? undefined,
      response_data: row.response_data,
      response_status_code: row.response_status_code,
      response_delay_ms: row.response_delay_ms,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      created_by: row.created_by ?? undefined,
    };
  }
}
