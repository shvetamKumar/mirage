import { Pool } from 'pg';
import { MockEndpointModel } from '../models/mock-endpoint.model';
import { ValidationService } from '../utils/validation';
import { PatternMatcher } from '../utils/pattern-matcher';
import { logger } from '../utils/logger';
import { config } from '../config';
import {
  MockEndpoint,
  CreateMockEndpointRequest,
  UpdateMockEndpointRequest,
  MockEndpointListQuery,
  MockEndpointListResponse,
  MockRequest,
  MockResponse,
  ValidationError
} from '../types';

export class MockEndpointService {
  private model: MockEndpointModel;
  private validationService: ValidationService;

  constructor(pool: Pool) {
    this.model = new MockEndpointModel(pool);
    this.validationService = ValidationService.getInstance();
  }

  async createEndpoint(data: CreateMockEndpointRequest): Promise<{ id: string; errors?: ValidationError[] }> {
    // Validate input data
    const validationErrors = this.validateCreateRequest(data);
    if (validationErrors.length > 0) {
      return { id: '', errors: validationErrors };
    }

    try {
      // Check for duplicate active endpoint
      const existing = await this.model.findByMethodAndPattern(data.method, data.url_pattern);
      if (existing) {
        return {
          id: '',
          errors: [{
            field: 'url_pattern',
            message: `Active endpoint already exists for ${data.method} ${data.url_pattern}`,
          }]
        };
      }

      const id = await this.model.create(data);
      logger.info('Mock endpoint service created endpoint', { id, name: data.name });
      
      return { id };
    } catch (error) {
      logger.error('Mock endpoint service failed to create endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
      throw new Error('Failed to create mock endpoint');
    }
  }

  async getEndpoint(id: string): Promise<MockEndpoint | null> {
    try {
      return await this.model.findById(id);
    } catch (error) {
      logger.error('Mock endpoint service failed to get endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      throw new Error('Failed to retrieve mock endpoint');
    }
  }

  async listEndpoints(query: MockEndpointListQuery): Promise<MockEndpointListResponse> {
    try {
      const limit = Math.min(query.limit || 50, 100); // Cap at 100
      const offset = Math.max(query.offset || 0, 0);

      const { endpoints, total } = await this.model.findMany({
        ...query,
        limit,
        offset
      });

      return {
        endpoints,
        total,
        limit,
        offset
      };
    } catch (error) {
      logger.error('Mock endpoint service failed to list endpoints', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      throw new Error('Failed to list mock endpoints');
    }
  }

  async updateEndpoint(id: string, data: UpdateMockEndpointRequest): Promise<{ success: boolean; errors?: ValidationError[] }> {
    // Validate input data
    const validationErrors = this.validateUpdateRequest(data);
    if (validationErrors.length > 0) {
      return { success: false, errors: validationErrors };
    }

    try {
      // Check if endpoint exists
      const existing = await this.model.findById(id);
      if (!existing) {
        return {
          success: false,
          errors: [{
            field: 'id',
            message: 'Mock endpoint not found',
          }]
        };
      }

      // Check for conflicts if method or url_pattern is being updated
      if (data.method || data.url_pattern) {
        const method = data.method || existing.method;
        const urlPattern = data.url_pattern || existing.url_pattern;
        
        const conflicting = await this.model.findByMethodAndPattern(method, urlPattern);
        if (conflicting && conflicting.id !== id) {
          return {
            success: false,
            errors: [{
              field: 'url_pattern',
              message: `Active endpoint already exists for ${method} ${urlPattern}`,
            }]
          };
        }
      }

      const success = await this.model.update(id, data);
      if (success) {
        logger.info('Mock endpoint service updated endpoint', { id });
      }
      
      return { success };
    } catch (error) {
      logger.error('Mock endpoint service failed to update endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        data
      });
      throw new Error('Failed to update mock endpoint');
    }
  }

  async deleteEndpoint(id: string): Promise<boolean> {
    try {
      const success = await this.model.softDelete(id);
      if (success) {
        logger.info('Mock endpoint service deleted endpoint', { id });
      }
      return success;
    } catch (error) {
      logger.error('Mock endpoint service failed to delete endpoint', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id
      });
      throw new Error('Failed to delete mock endpoint');
    }
  }

  async handleMockRequest(request: MockRequest): Promise<MockResponse | null> {
    try {
      // Find matching endpoints
      const candidates = await this.model.findMatchingEndpoints(request.method);
      
      // Find the best match using pattern matcher
      const matchedEndpoint = PatternMatcher.findBestMatch(request.url, request.method, candidates);
      
      if (!matchedEndpoint) {
        logger.info('No matching endpoint found', { 
          method: request.method, 
          url: request.url 
        });
        return null;
      }

      // Validate request body against schema if provided
      if (matchedEndpoint.request_schema && request.body) {
        const { isValid, errors } = this.validationService.validateRequestBody(
          request.body, 
          matchedEndpoint.request_schema
        );
        
        if (!isValid) {
          logger.info('Request validation failed', { 
            endpoint: matchedEndpoint.id,
            errors 
          });
          
          return {
            status_code: 400,
            data: {
              error: 'Request validation failed',
              details: errors
            },
            delay_ms: 0
          };
        }
      }

      // Extract path parameters
      const pathParams = PatternMatcher.extractPathParameters(request.url, matchedEndpoint.url_pattern);
      
      logger.info('Mock request handled', {
        endpoint: matchedEndpoint.id,
        method: request.method,
        url: request.url,
        pathParams
      });

      // Apply response delay
      if (matchedEndpoint.response_delay_ms > 0) {
        await new Promise(resolve => setTimeout(resolve, matchedEndpoint.response_delay_ms));
      }

      return {
        status_code: matchedEndpoint.response_status_code,
        data: matchedEndpoint.response_data,
        headers: {
          'X-Mirage-Mock': 'true',
          'X-Mirage-Endpoint-Id': matchedEndpoint.id,
          'X-Mirage-Matched-Pattern': matchedEndpoint.url_pattern
        },
        delay_ms: matchedEndpoint.response_delay_ms
      };
      
    } catch (error) {
      logger.error('Mock endpoint service failed to handle request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
      throw new Error('Failed to handle mock request');
    }
  }

  private validateCreateRequest(data: CreateMockEndpointRequest): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required' });
    }

    if (!data.method) {
      errors.push({ field: 'method', message: 'Method is required' });
    } else if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(data.method)) {
      errors.push({ field: 'method', message: 'Invalid HTTP method' });
    }

    if (!data.url_pattern) {
      errors.push({ field: 'url_pattern', message: 'URL pattern is required' });
    } else if (!data.url_pattern.startsWith('/')) {
      errors.push({ field: 'url_pattern', message: 'URL pattern must start with /' });
    }

    if (!data.response_data) {
      errors.push({ field: 'response_data', message: 'Response data is required' });
    }

    if (data.response_status_code && (data.response_status_code < 100 || data.response_status_code >= 600)) {
      errors.push({ field: 'response_status_code', message: 'Invalid HTTP status code' });
    }

    if (data.response_delay_ms && (data.response_delay_ms < 0 || data.response_delay_ms > config.mock.maxResponseDelay)) {
      errors.push({ 
        field: 'response_delay_ms', 
        message: `Response delay must be between 0 and ${config.mock.maxResponseDelay}ms` 
      });
    }

    return errors;
  }

  private validateUpdateRequest(data: UpdateMockEndpointRequest): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      errors.push({ field: 'name', message: 'Name cannot be empty' });
    }

    if (data.method !== undefined && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(data.method)) {
      errors.push({ field: 'method', message: 'Invalid HTTP method' });
    }

    if (data.url_pattern !== undefined && !data.url_pattern.startsWith('/')) {
      errors.push({ field: 'url_pattern', message: 'URL pattern must start with /' });
    }

    if (data.response_status_code !== undefined && (data.response_status_code < 100 || data.response_status_code >= 600)) {
      errors.push({ field: 'response_status_code', message: 'Invalid HTTP status code' });
    }

    if (data.response_delay_ms !== undefined && (data.response_delay_ms < 0 || data.response_delay_ms > config.mock.maxResponseDelay)) {
      errors.push({ 
        field: 'response_delay_ms', 
        message: `Response delay must be between 0 and ${config.mock.maxResponseDelay}ms` 
      });
    }

    return errors;
  }
}