// Base API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  timestamp?: string;
}

// Error response structure
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

// Authentication API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string | undefined;
    last_name: string | undefined;
    is_verified: boolean;
  };
  token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    first_name: string | undefined;
    last_name: string | undefined;
    is_verified: boolean;
    created_at: Date;
  };
}

export interface VerifyEmailRequest {
  token: string;
  email: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ApiKeyCreateRequest {
  name: string;
  permissions?: string[];
  expires_at?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  expires_at: Date | undefined;
  last_used_at: Date | undefined;
  created_at: Date;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string; // Only returned on creation
}

// Dashboard and usage types
export interface DashboardResponse {
  user: {
    id: string;
    email: string;
    first_name: string | undefined;
    last_name: string | undefined;
    is_verified: boolean;
    created_at: Date;
  };
  subscription: {
    plan_name: string;
    status: string;
    endpoints_limit: number;
    requests_limit: number;
    features: Record<string, unknown>;
  };
  usage: {
    endpoints_used: number;
    requests_used: number;
    requests_remaining: number;
    endpoints_remaining: number;
  };
  recent_activity: Array<{
    endpoint_name: string;
    method: string;
    url_pattern: string;
    response_status: number;
    timestamp: Date;
  }>;
}

// Mock endpoint API types
export interface CreateMockEndpointRequest {
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url_pattern?: string;
  request_schema?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  response_status_code?: number;
  response_delay_ms?: number;
  is_active?: boolean;
}

export interface MockEndpointResponse {
  id: string;
  name: string;
  description: string | undefined;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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

export interface MockEndpointListQuery {
  is_active?: boolean;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MockEndpointListResponse {
  endpoints: MockEndpointResponse[];
  total: number;
  limit: number;
  offset: number;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  database: {
    status: 'connected' | 'disconnected';
    response_time?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Metrics types
export interface MetricsResponse {
  requests_total: number;
  requests_per_minute: number;
  average_response_time: number;
  active_endpoints: number;
  error_rate: number;
  uptime_seconds: number;
}

// Mock request/response types for serving
export interface MockRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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