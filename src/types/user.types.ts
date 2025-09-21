export interface User {
  id: string;
  email: string;
  first_name: string | undefined;
  last_name: string | undefined;
  role: 'user' | 'admin';
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | undefined;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | undefined;
  price_monthly: number;
  price_yearly: number;
  max_endpoints: number;
  max_requests_per_month: number;
  max_request_delay_ms: number;
  features: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'expired' | 'suspended';
  started_at: Date;
  expires_at: Date | undefined;
  canceled_at: Date | undefined;
  created_at: Date;
  updated_at: Date;
  plan?: SubscriptionPlan;
}

export interface ApiUsage {
  id: string;
  user_id: string;
  endpoint_id: string | undefined;
  method: string;
  url_pattern: string;
  response_status_code: number | undefined;
  processing_time_ms: number | undefined;
  created_at: Date;
  date_key: Date;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: Date | undefined;
  expires_at: Date | undefined;
  created_at: Date;
  updated_at: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions?: string[];
  expires_at?: Date;
}

export interface CreateApiKeyResponse {
  id: string;
  key: string; // Full key only returned once
  message: string;
}

export interface UsageStats {
  current_period_requests: number;
  max_requests: number;
  requests_remaining: number;
  current_period_endpoints: number;
  max_endpoints: number;
  endpoints_remaining: number;
  period_start: Date;
  period_end: Date;
}

export interface UserDashboard {
  user: User;
  subscription: UserSubscription | undefined;
  usage_stats: UsageStats;
  recent_usage: ApiUsage[];
  api_keys: UserApiKey[];
}

export interface JwtPayload {
  user_id: string;
  email: string;
  role: 'user' | 'admin';
  subscription_id?: string;
  jti: string; // JWT ID for token revocation
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  subscription?: UserSubscription;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
