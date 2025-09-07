export interface MockEndpoint {
  id: string;
  name: string;
  description: string | undefined;
  method: HttpMethod;
  url_pattern: string;
  request_schema: Record<string, unknown> | undefined;
  response_data: Record<string, unknown>;
  response_status_code: number;
  response_delay_ms: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | undefined;
}

export interface CreateMockEndpointRequest {
  name: string;
  description?: string;
  method: HttpMethod;
  url_pattern: string;
  request_schema?: Record<string, unknown>;
  response_data: Record<string, unknown>;
  response_status_code?: number;
  response_delay_ms?: number;
  created_by?: string;
}

export interface UpdateMockEndpointRequest {
  name?: string;
  description?: string;
  method?: HttpMethod;
  url_pattern?: string;
  request_schema?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  response_status_code?: number;
  response_delay_ms?: number;
}

export interface MockEndpointListQuery {
  is_active?: boolean;
  method?: HttpMethod;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MockEndpointListResponse {
  endpoints: MockEndpoint[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateMockEndpointResponse {
  id: string;
  message: string;
}

export interface UpdateMockEndpointResponse {
  id: string;
  message: string;
}

export interface DeleteMockEndpointResponse {
  id: string;
  message: string;
}

export interface MockRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

export interface MockResponse {
  status_code: number;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
  delay_ms: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface DatabaseRow {
  [key: string]: unknown;
}

export interface QueryResult<T = DatabaseRow> {
  rows: T[];
  rowCount: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}