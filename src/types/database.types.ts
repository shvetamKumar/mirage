export interface MockEndpointRow {
  id: string;
  name: string;
  description: string | null;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url_pattern: string;
  request_schema: Record<string, unknown> | null;
  response_data: Record<string, unknown>;
  response_status_code: number;
  response_delay_ms: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_id: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  verification_token: string | null;
  reset_password_token: string | null;
  reset_password_expires: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'annual';
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserApiKeyRow {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiUsageRow {
  id: string;
  user_id: string;
  endpoint_id: string | null;
  method: string;
  url_pattern: string;
  response_status_code: number;
  processing_time_ms: number;
  created_at: string;
  date_key: string;
}

export interface SchemaMigrationRow {
  version: string;
  applied_at: string;
}

// Generic database result types
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

// Count result type
export interface CountResult {
  total: string;
}