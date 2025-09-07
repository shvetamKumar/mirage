import { Pool } from 'pg';
import { MockEndpoint, CreateMockEndpointRequest, UpdateMockEndpointRequest, MockEndpointListQuery, QueryResult } from '../types';
import { logger } from '../utils/logger';

export class MockEndpointModel {
  constructor(private pool: Pool) {}

  async create(data: CreateMockEndpointRequest): Promise<string> {
    const query = `
      INSERT INTO mock_endpoints (
        name, description, method, url_pattern, request_schema, 
        response_data, response_status_code, response_delay_ms, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
    ];

    try {
      const result = await this.pool.query(query, values);
      const id = result.rows[0]?.id as string;
      
      logger.info('Mock endpoint created', { id, name: data.name, method: data.method, url_pattern: data.url_pattern });
      
      return id;
    } catch (error) {
      logger.error('Failed to create mock endpoint', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        data 
      });
      throw error;
    }
  }

  async findById(id: string): Promise<MockEndpoint | null> {
    const query = `
      SELECT * FROM mock_endpoints 
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMockEndpoint(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find mock endpoint by ID', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        id 
      });
      throw error;
    }
  }

  async findMany(filters: MockEndpointListQuery): Promise<{ endpoints: MockEndpoint[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

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
        this.pool.query(countQuery, values),
        this.pool.query(dataQuery, dataValues)
      ]);

      const total = parseInt(countResult.rows[0]?.total as string, 10) || 0;
      const endpoints = dataResult.rows.map(row => this.mapRowToMockEndpoint(row));

      return { endpoints, total };
    } catch (error) {
      logger.error('Failed to find mock endpoints', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filters 
      });
      throw error;
    }
  }

  async update(id: string, data: UpdateMockEndpointRequest): Promise<boolean> {
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

    const query = `
      UPDATE mock_endpoints 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter} AND is_active = true
      RETURNING id
    `;

    values.push(id);

    try {
      const result = await this.pool.query(query, values);
      const updated = (result.rowCount || 0) > 0;
      
      if (updated) {
        logger.info('Mock endpoint updated', { id, updatedFields: Object.keys(data) });
      }
      
      return updated;
    } catch (error) {
      logger.error('Failed to update mock endpoint', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        data 
      });
      throw error;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    const query = `
      UPDATE mock_endpoints 
      SET is_active = false 
      WHERE id = $1 AND is_active = true
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [id]);
      const deleted = (result.rowCount || 0) > 0;
      
      if (deleted) {
        logger.info('Mock endpoint soft deleted', { id });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Failed to soft delete mock endpoint', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        id 
      });
      throw error;
    }
  }

  async findByMethodAndPattern(method: string, urlPattern: string): Promise<MockEndpoint | null> {
    const query = `
      SELECT * FROM mock_endpoints 
      WHERE method = $1 AND url_pattern = $2 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [method, urlPattern]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMockEndpoint(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find mock endpoint by method and pattern', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        method,
        urlPattern 
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
      const result = await this.pool.query(query, [method]);
      return result.rows.map(row => this.mapRowToMockEndpoint(row));
    } catch (error) {
      logger.error('Failed to find matching endpoints', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        method 
      });
      throw error;
    }
  }

  private mapRowToMockEndpoint(row: Record<string, unknown>): MockEndpoint {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      description: row['description'] as string | undefined,
      method: row['method'] as MockEndpoint['method'],
      url_pattern: row['url_pattern'] as string,
      request_schema: row['request_schema'] as Record<string, unknown> | undefined,
      response_data: row['response_data'] as Record<string, unknown>,
      response_status_code: row['response_status_code'] as number,
      response_delay_ms: row['response_delay_ms'] as number,
      is_active: row['is_active'] as boolean,
      created_at: new Date(row['created_at'] as string),
      updated_at: new Date(row['updated_at'] as string),
      created_by: row['created_by'] as string | undefined,
    };
  }
}