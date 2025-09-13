# Mirage API Reference

Complete API documentation for the Mirage Mock Data Service with authentication and freemium features.

## Base URL

```
http://localhost:3000
```

## Authentication

Mirage supports two authentication methods:

### 1. JWT Authentication (Recommended)
```http
Authorization: Bearer <jwt_token>
```

### 2. API Key Authentication
```http
Authorization: <api_key>
```

## Authentication Endpoints

### Register User
Create a new user account with free subscription.

```http
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Developer"
}
```

**Password Requirements:**
- At least 8 characters
- Must contain uppercase letter
- Must contain lowercase letter  
- Must contain number
- Must contain special character

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification instructions.",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Developer",
      "is_verified": false,
      "created_at": "2025-01-15T10:30:00Z"
    }
  }
}
```

### Login User
Authenticate user and receive JWT token.

```http
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Developer",
      "is_verified": false,
      "last_login_at": "2025-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 604800
  }
}
```

### Verify Email
Verify user email address with token.

```http
POST /api/v1/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Get User Profile
Get current user profile information.

```http
GET /api/v1/auth/profile
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Developer",
      "is_verified": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "last_login_at": "2025-01-15T11:00:00Z"
    }
  }
}
```

### Get User Dashboard
Get comprehensive dashboard with usage stats, subscription, and API keys.

```http
GET /api/v1/auth/dashboard
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Developer",
      "is_verified": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "last_login_at": "2025-01-15T11:00:00Z"
    },
    "subscription": {
      "id": "sub-123",
      "plan": {
        "name": "Free",
        "description": "Free tier with basic features",
        "max_endpoints": 10,
        "max_requests_per_month": 10,
        "features": ["Basic mocking", "JSON responses", "Pattern matching"]
      },
      "status": "active",
      "started_at": "2025-01-15T10:30:00Z"
    },
    "usage_stats": {
      "current_period_requests": 5,
      "max_requests": 10,
      "requests_remaining": 5,
      "current_period_endpoints": 3,
      "max_endpoints": 10,
      "endpoints_remaining": 7,
      "period_start": "2025-01-01T00:00:00Z",
      "period_end": "2025-01-31T23:59:59Z"
    },
    "recent_usage": [
      {
        "method": "POST",
        "url_pattern": "/api/auth/login",
        "response_status_code": 200,
        "processing_time_ms": 45,
        "created_at": "2025-01-15T11:00:00Z"
      }
    ],
    "api_keys": [
      {
        "id": "key-123",
        "key_prefix": "mk_abcd123",
        "name": "Development Key",
        "permissions": ["read", "write"],
        "is_active": true,
        "last_used_at": "2025-01-15T10:45:00Z",
        "created_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Create API Key
Generate a new API key for authentication.

```http
POST /api/v1/auth/api-keys
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Production API Key",
  "permissions": ["read", "write"],
  "expires_at": "2025-12-31T23:59:59Z"
}
```

**Available Permissions:**
- `read` - Read access to mock endpoints
- `write` - Create/update/delete access
- `admin` - Full administrative access

**Response (201):**
```json
{
  "success": true,
  "message": "API key created successfully. Store this key safely as it cannot be retrieved again.",
  "data": {
    "id": "key-456",
    "key": "mk_abcd123456789...full_key_here",
    "warning": "Store this API key safely. It cannot be retrieved again."
  }
}
```

## Mock Endpoint Management

All mock endpoint operations require authentication and are scoped to the authenticated user.

### Create Mock Endpoint
Create a new mock endpoint configuration.

```http
POST /api/v1/mock-endpoints
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "User Login API",
  "description": "Mock user authentication endpoint",
  "method": "POST",
  "url_pattern": "/api/auth/login",
  "request_schema": {
    "type": "object",
    "required": ["email", "password"],
    "properties": {
      "email": {"type": "string", "format": "email"},
      "password": {"type": "string", "minLength": 8}
    }
  },
  "response_data": {
    "success": true,
    "token": "mock-jwt-token-12345",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "Test User"
    },
    "expires_in": 3600
  },
  "response_status_code": 200,
  "response_delay_ms": 300
}
```

**Field Descriptions:**
- `name` (required): Human-readable name for the endpoint
- `description` (optional): Description of the endpoint purpose
- `method` (required): HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`)
- `url_pattern` (required): URL pattern to match (supports parameters)
- `request_schema` (optional): JSON schema for request validation
- `response_data` (required): JSON response to return
- `response_status_code` (optional): HTTP status code (default: 200)
- `response_delay_ms` (optional): Artificial delay in milliseconds (default: 0)

**Response (201):**
```json
{
  "id": "endpoint-123",
  "message": "Mock endpoint created successfully"
}
```

### List Mock Endpoints
Get all mock endpoints for the authenticated user.

```http
GET /api/v1/mock-endpoints?is_active=true&limit=20&offset=0
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `is_active` (optional): Filter by active status (`true`/`false`)
- `method` (optional): Filter by HTTP method
- `search` (optional): Search in name and description
- `limit` (optional): Number of results (max: 100, default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "endpoints": [
    {
      "id": "endpoint-123",
      "name": "User Login API",
      "description": "Mock user authentication endpoint",
      "method": "POST",
      "url_pattern": "/api/auth/login",
      "request_schema": {...},
      "response_data": {...},
      "response_status_code": 200,
      "response_delay_ms": 300,
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

### Get Mock Endpoint
Get a specific mock endpoint by ID.

```http
GET /api/v1/mock-endpoints/{id}
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": "endpoint-123",
  "name": "User Login API",
  "description": "Mock user authentication endpoint",
  "method": "POST",
  "url_pattern": "/api/auth/login",
  "request_schema": {
    "type": "object",
    "required": ["email", "password"],
    "properties": {
      "email": {"type": "string", "format": "email"},
      "password": {"type": "string", "minLength": 8}
    }
  },
  "response_data": {
    "success": true,
    "token": "mock-jwt-token-12345",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "Test User"
    },
    "expires_in": 3600
  },
  "response_status_code": 200,
  "response_delay_ms": 300,
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Update Mock Endpoint
Update an existing mock endpoint.

```http
PUT /api/v1/mock-endpoints/{id}
Authorization: Bearer <jwt_token>
```

**Request Body (partial update supported):**
```json
{
  "name": "Updated User Login API",
  "response_status_code": 201,
  "response_delay_ms": 500
}
```

**Response (200):**
```json
{
  "id": "endpoint-123",
  "message": "Mock endpoint updated successfully"
}
```

### Delete Mock Endpoint
Soft delete (deactivate) a mock endpoint.

```http
DELETE /api/v1/mock-endpoints/{id}
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": "endpoint-123",
  "message": "Mock endpoint deactivated successfully"
}
```

## Mock Serving

### Serve Mock Response
Call your configured mock endpoints. Authentication is optional but recommended for usage tracking.

```http
{method} /mock/{your-url-pattern}
Authorization: Bearer <jwt_token>  // Optional
```

**Example:**
```http
POST /mock/api/auth/login
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Headers:**
- `X-Mirage-Mock: true` - Indicates this is a mock response
- `X-Mirage-Endpoint-Id: endpoint-123` - ID of the matched endpoint
- `X-Mirage-Matched-Pattern: /api/auth/login` - Pattern that was matched
- `X-Mirage-Processing-Time: 305ms` - Total processing time
- `X-Mirage-Delay-Applied: 300ms` - Artificial delay applied

**Response (200):**
```json
{
  "success": true,
  "token": "mock-jwt-token-12345",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Test User"
  },
  "expires_in": 3600
}
```

### URL Pattern Matching

Mirage supports flexible URL patterns:

#### 1. Exact Match
```
Pattern: /api/users
Matches: /api/users
```

#### 2. Parameter Extraction
```
Pattern: /api/users/{id}
Matches: /api/users/123
Parameters: {"id": "123"}
```

#### 3. Wildcard Matching
```
Pattern: /api/posts/*
Matches: /api/posts/anything/here
```

#### 4. Multiple Parameters
```
Pattern: /api/users/{userId}/posts/{postId}
Matches: /api/users/123/posts/456
Parameters: {"userId": "123", "postId": "456"}
```

### Request Validation

If a `request_schema` is defined, incoming requests will be validated:

**Validation Success:** Returns your configured response
**Validation Failure:** Returns validation error:

```json
{
  "error": "Request validation failed",
  "details": [
    {
      "instancePath": "/email",
      "schemaPath": "#/properties/email/format",
      "keyword": "format",
      "params": {"format": "email"},
      "message": "must match format \"email\""
    }
  ]
}
```

## System Endpoints

### Health Check
Check service health and database connectivity.

```http
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "uptime": "2h 30m 45s",
  "database": "connected"
}
```

### Service Metrics
Get basic service metrics.

```http
GET /metrics
```

**Response (200):**
```json
{
  "service": "mirage-mock-service",
  "version": "1.0.0",
  "uptime": "2h 30m 45s",
  "memory_usage": {
    "used": "45MB",
    "total": "128MB"
  },
  "active_endpoints": 25,
  "total_requests_served": 1547
}
```

### Debug: List All Mocks
Development endpoint to list all active mock endpoints (no authentication).

```http
GET /debug/mocks
```

**Response (200):**
```json
{
  "available_mocks": [
    {
      "id": "endpoint-123",
      "name": "User Login API",
      "method": "POST",
      "url_pattern": "/api/auth/login",
      "mock_url": "/mock/api/auth/login"
    }
  ],
  "total": 1,
  "note": "Only active endpoints are shown"
}
```

## Error Responses

All errors follow a consistent format:

### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v1/auth/login"
}
```

### Authorization Errors (403)
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": ["write"],
    "available": ["read"]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Quota Exceeded (429)
```json
{
  "success": false,
  "message": "Monthly request limit exceeded (10 requests)",
  "code": "QUOTA_EXCEEDED",
  "details": {
    "quota_type": "requests",
    "usage_stats": {
      "current_period_requests": 10,
      "max_requests": 10,
      "requests_remaining": 0
    },
    "upgrade_url": "/api/v1/subscription/plans"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "email",
        "message": "Valid email is required"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long"
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Resource Not Found (404)
```json
{
  "success": false,
  "message": "Mock endpoint not found",
  "code": "ENDPOINT_NOT_FOUND",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v1/mock-endpoints/non-existent-id"
}
```

## Rate Limits

### API Management Endpoints
- **Rate**: 100 requests per 15 minutes per user
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Mock Serving Endpoints  
- **Rate**: 1000 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication Endpoints
- **Rate**: 20 requests per 15 minutes per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Usage Examples

### Complete Workflow Example

```bash
#!/bin/bash

# 1. Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Developer"
  }'

# 2. Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "password": "SecurePass123!"}' \
  | jq -r '.data.token')

echo "JWT Token: $TOKEN"

# 3. Create a mock endpoint
ENDPOINT_ID=$(curl -s -X POST http://localhost:3000/api/v1/mock-endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Get User Profile",
    "method": "GET", 
    "url_pattern": "/api/user/profile",
    "response_data": {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg"
    },
    "response_status_code": 200
  }' | jq -r '.id')

echo "Created endpoint: $ENDPOINT_ID"

# 4. Test the mock endpoint
curl -X GET http://localhost:3000/mock/api/user/profile \
  -H "Authorization: Bearer $TOKEN"

# 5. Check usage dashboard
curl -X GET http://localhost:3000/api/v1/auth/dashboard \
  -H "Authorization: Bearer $TOKEN" | jq '.data.usage_stats'

# 6. Create an API key for easier access
API_KEY=$(curl -s -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Development Key", "permissions": ["read", "write"]}' \
  | jq -r '.data.key')

echo "API Key: $API_KEY"

# 7. Use API key to list endpoints
curl -X GET http://localhost:3000/api/v1/mock-endpoints \
  -H "Authorization: $API_KEY"
```

### Error Handling Example

```bash
# Handle authentication errors
response=$(curl -s -w "%{http_code}" \
  -X GET http://localhost:3000/api/v1/auth/profile)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 401 ]; then
  echo "Authentication required"
  echo "$body" | jq '.message'
elif [ "$http_code" -eq 429 ]; then
  echo "Quota exceeded"
  echo "$body" | jq '.details.usage_stats'
else
  echo "Success: $body"
fi
```

## SDK Examples

### JavaScript/Node.js

```javascript
class MirageClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async request(method, path, data = null) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`${result.code}: ${result.message}`);
    }
    
    return result;
  }

  // Authentication
  async login(email, password) {
    return this.request('POST', '/api/v1/auth/login', { email, password });
  }

  // Mock endpoints
  async createEndpoint(config) {
    return this.request('POST', '/api/v1/mock-endpoints', config);
  }

  async getEndpoints(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request('GET', `/api/v1/mock-endpoints?${query}`);
  }

  // Dashboard
  async getDashboard() {
    return this.request('GET', '/api/v1/auth/dashboard');
  }
}

// Usage
const client = new MirageClient('http://localhost:3000', 'your-jwt-token');

try {
  const endpoint = await client.createEndpoint({
    name: 'User API',
    method: 'GET',
    url_pattern: '/api/users/{id}',
    response_data: { id: 1, name: 'John' }
  });
  
  console.log('Created endpoint:', endpoint.id);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Python

```python
import requests
from typing import Dict, Any, Optional

class MirageClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })

    def request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        response = self.session.request(
            method, 
            f"{self.base_url}{path}", 
            json=data
        )
        
        result = response.json()
        
        if not response.ok:
            raise Exception(f"{result.get('code', 'ERROR')}: {result.get('message', 'Unknown error')}")
        
        return result

    def login(self, email: str, password: str) -> Dict[str, Any]:
        return self.request('POST', '/api/v1/auth/login', {
            'email': email, 
            'password': password
        })

    def create_endpoint(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return self.request('POST', '/api/v1/mock-endpoints', config)

    def get_endpoints(self, **filters) -> Dict[str, Any]:
        query = '&'.join([f"{k}={v}" for k, v in filters.items()])
        path = f"/api/v1/mock-endpoints?{query}" if query else "/api/v1/mock-endpoints"
        return self.request('GET', path)

    def get_dashboard(self) -> Dict[str, Any]:
        return self.request('GET', '/api/v1/auth/dashboard')

# Usage
client = MirageClient('http://localhost:3000', 'your-jwt-token')

try:
    endpoint = client.create_endpoint({
        'name': 'Products API',
        'method': 'GET',
        'url_pattern': '/api/products',
        'response_data': [
            {'id': 1, 'name': 'Product 1'},
            {'id': 2, 'name': 'Product 2'}
        ]
    })
    
    print(f"Created endpoint: {endpoint['id']}")
except Exception as e:
    print(f"Error: {e}")
```

This comprehensive API reference covers all endpoints, authentication methods, error handling, and usage patterns for the Mirage Mock Data Service.