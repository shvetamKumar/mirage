# Mirage - Dummy Data Service

A TypeScript-powered development tool for providing configurable mock endpoints with user authentication and freemium features to accelerate development.

## 🚀 Features

### 🎨 Web Dashboard
- **Professional UI/UX**: Clean, modern web dashboard with black and white theme
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Live usage statistics and endpoint management
- **Interactive Forms**: Create and edit mock endpoints with validation
- **Visual Feedback**: Progress bars, status indicators, and method badges
- **Single Page App**: Fast, smooth navigation without page reloads

### Core Mock API Features
- **Mock Endpoint Management**: Create, read, update, and delete mock API endpoints
- **Intelligent Request Matching**: Pattern-based URL matching with parameter extraction
- **Request Validation**: JSON schema validation for incoming requests
- **Configurable Responses**: Custom status codes, delays, and response data
- **Production-Ready**: Comprehensive error handling, logging, and security middleware

### User Authentication & Management
- **User Registration & Login**: Secure password hashing and JWT authentication
- **Email Verification**: Email verification system for account security (configurable for development)
- **API Key Authentication**: Alternative authentication method with granular permissions
- **User Profiles**: Complete user profile management with comprehensive dashboard
- **Account Management**: Quota-exempt operations for API key creation and profile access

### Freemium Model
- **Free Tier**: 10 mock endpoints and 10 API requests per month
- **Usage Tracking**: Real-time monitoring of API usage and quotas
- **Quota Enforcement**: Automatic limiting with graceful error handling and exemptions
- **Calendar-based Reset**: Monthly limits reset automatically on the 1st of each month at 00:00 UTC
- **Account Management Exemptions**: Profile access and API key creation exempt from quotas
- **Subscription Management**: Extensible subscription system for future premium plans

### Security & Performance
- **Enterprise-Grade Security**: CSRF protection, token revocation, and secure error handling
- **Rate Limiting**: Configurable request limits per user and endpoint type
- **User Isolation**: All mock endpoints are user-scoped and private
- **JWT & API Key Auth**: Multiple authentication methods with revocation support
- **Quota Exemptions**: Account management operations exempt from request quotas
- **Docker Support**: Full containerization with PostgreSQL integration

## 🏗️ Architecture

Built with modern TypeScript and enterprise-grade practices:

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with raw SQL queries (no ORM)
- **Authentication**: JWT + bcrypt with API key support
- **Validation**: AJV for JSON schema validation + express-validator
- **Logging**: Winston with structured logging
- **Security**: Helmet, rate limiting, CORS protection, and SQL injection prevention
- **Testing**: Jest with TypeScript support

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Docker & Docker Compose (optional)

## 🔧 Installation & Setup

### Using npm

1. **Clone and install dependencies**
   ```bash
   git clone <repository>
   cd mirage
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

   **Required Environment Variables:**
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mirage_db
   DB_USER=your_user
   DB_PASSWORD=your_password

   # Authentication & Security
   JWT_SECRET=your-super-secure-jwt-secret-key
   JWT_EXPIRES_IN=7d
   BCRYPT_ROUNDS=12
   CSRF_SECRET=your-csrf-protection-secret

   # Server
   PORT=3000
   NODE_ENV=development
   ```

3. **Set up the database**
   ```bash
   npm run db:setup
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   **Optional Development Settings:**
   ```env
   # Skip email verification for development
   SKIP_EMAIL_VERIFICATION=true
   ```

### Using Docker

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

The service will be available at `http://localhost:3000`

**Access the Web Dashboard:** Open your browser and navigate to `http://localhost:3000` to access the web dashboard interface.

## 📚 API Reference

### Authentication APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST   | `/api/v1/auth/register` | User registration | No |
| POST   | `/api/v1/auth/login` | User login | No |
| POST   | `/api/v1/auth/verify-email` | Verify email address | No |
| GET    | `/api/v1/auth/csrf-token` | Get CSRF token for forms | No |
| GET    | `/api/v1/auth/profile` | Get user profile | Yes |
| GET    | `/api/v1/auth/dashboard` | User dashboard with usage stats | Yes |
| POST   | `/api/v1/auth/api-keys` | Create API key | Yes |
| DELETE | `/api/v1/auth/api-keys/:id` | Deactivate API key | Yes |
| POST   | `/api/v1/auth/logout` | Logout and revoke JWT token | Yes |

### Mock Endpoint Management APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST   | `/api/v1/mock-endpoints` | Create mock endpoint | Yes |
| GET    | `/api/v1/mock-endpoints` | List user's mock endpoints | Yes |
| GET    | `/api/v1/mock-endpoints/:id` | Get specific endpoint | Yes |
| PUT    | `/api/v1/mock-endpoints/:id` | Update mock endpoint | Yes |
| DELETE | `/api/v1/mock-endpoints/:id` | Deactivate endpoint | Yes |

### Mock Serving APIs

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| ANY    | `/mock/*` | Serve mock responses | Optional* |
| GET    | `/health` | Health check | No |
| GET    | `/metrics` | Service metrics | No |
| GET    | `/debug/mocks` | List all active mocks (debug) | No |

*Optional authentication tracks usage against user quotas

### Web Dashboard

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Main dashboard interface | No (redirects to login) |
| Static files served from `/public` directory | Dashboard assets | No |

## 🔐 Authentication

### JWT Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token in subsequent requests
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### API Key Authentication
```bash
# Create API key (requires JWT authentication)
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key", "permissions": ["read", "write"]}'

# Use API key for requests
curl -X GET http://localhost:3000/api/v1/mock-endpoints \
  -H "Authorization: mk_your_api_key_here"
```

### Getting JWT Tokens for External Use

For accessing mock endpoints externally (like from your applications), you have two options:

#### Option 1: Login via API to get JWT Token
```bash
# Login to get JWT token programmatically
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}' \
  | jq -r '.data.token'
```

#### Option 2: Create API Key (Recommended)
```bash
# First login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}' \
  | jq -r '.data.token')

# Create API key for long-term use
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "External App Key", "permissions": ["read", "write"]}' \
  | jq -r '.data.key'
```

API keys are recommended for external applications as they:
- Don't expire like JWT tokens
- Can be scoped with specific permissions
- Are easier to manage and rotate
```

## 📖 Usage Examples

### Web Dashboard Usage

1. **Access Dashboard**
   ```
   Open http://localhost:3000 in your browser
   ```

2. **Register New Account**
   - Click "Register" on the login page
   - Fill in email, password, and optional name fields
   - Password requirements: 8+ chars, uppercase, lowercase, number, special char

3. **Login and Explore**
   - Login with your credentials
   - View your usage statistics and subscription limits
   - Create, edit, and manage mock endpoints
   - Monitor recent activity
   - Create API keys for external access

4. **Create Mock Endpoint**
   - Click "Create New Endpoint"
   - Fill in endpoint details (name, method, URL pattern)
   - Configure response data and status code
   - Set optional delay for response simulation
   - Test your endpoint immediately

### API Usage Examples

### 1. User Registration
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Developer"
  }'
```

### 2. Creating a Mock Endpoint
```bash
# First, login to get your JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "developer@example.com", "password": "SecurePass123!"}' \
  | jq -r '.data.token')

# Create mock endpoint
curl -X POST http://localhost:3000/api/v1/mock-endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Login API",
    "method": "POST",
    "url_pattern": "/api/auth/login",
    "request_schema": {
      "type": "object",
      "required": ["email", "password"],
      "properties": {
        "email": {"type": "string", "format": "email"},
        "password": {"type": "string"}
      }
    },
    "response_data": {
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
  }'
```

### 3. Using Your Mock Endpoint
```bash
# Your mock endpoint is now available at /mock/<your-pattern>
curl -X POST http://localhost:3000/mock/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response includes usage tracking headers:
# X-Mirage-Mock: true
# X-Mirage-Endpoint-Id: <endpoint-id>
# X-Mirage-Processing-Time: 305ms
```

### 4. Check Usage Dashboard
```bash
curl -X GET http://localhost:3000/api/v1/auth/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

Response includes:
```json
{
  "user": {...},
  "subscription": {
    "plan": {
      "name": "Free",
      "max_endpoints": 10,
      "max_requests_per_month": 10
    }
  },
  "usage_stats": {
    "current_period_requests": 5,
    "requests_remaining": 5,
    "current_period_endpoints": 3,
    "endpoints_remaining": 7
  },
  "recent_usage": [...],
  "api_keys": [...]
}
```

### Pattern Matching Examples

The service supports flexible URL patterns:

- `/api/users/{id}` - Matches `/api/users/123` (extracts id parameter)
- `/api/posts/*` - Matches `/api/posts/anything`
- `/api/search?query={term}` - Matches query parameters
- `/api/exact-match` - Exact string matching

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production  
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
npm run db:migrate   # Run database migrations
npm run db:setup     # Setup database (run migrations)
```

### Project Structure

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
│   ├── auth.controller.ts
│   ├── mock-endpoint.controller.ts
│   └── mock-serving.controller.ts
├── database/        # Database connection & migrations
│   ├── connection.ts
│   ├── migrate.ts
│   ├── schema.sql
│   ├── user_schema.sql
│   └── add_user_id_migration.sql
├── middleware/      # Express middleware
│   ├── auth.ts      # JWT/API key authentication with quota enforcement
│   ├── error-handler.ts
│   ├── security.ts  # Rate limiting & security
│   └── validation.ts # Request validation middleware
├── models/          # Data access layer
│   ├── mock-endpoint.model.ts
│   └── user.model.ts
├── routes/          # Route definitions
│   ├── auth.routes.ts
│   └── mock-endpoint.routes.ts
├── services/        # Business logic
│   ├── mock-endpoint.service.ts
│   └── user.service.ts
├── types/           # TypeScript type definitions
│   ├── index.ts     # Main type exports
│   ├── api.types.ts # API request/response types
│   ├── database.types.ts # Database types
│   └── user.types.ts
└── utils/           # Utility functions
    ├── auth.ts      # Authentication utilities
    ├── logger.ts
    └── validation.ts

public/              # Web Dashboard (Static Files)
├── index.html       # Main dashboard interface
├── css/
│   └── styles.css   # Professional black/white theme
└── js/
    └── app.js       # Single-page application logic
```

## 🔒 Security Features

### Authentication & Authorization
- **Password Security**: bcrypt with configurable rounds (default: 12)
- **JWT Tokens**: Signed with cryptographically secure secrets, configurable expiration, and revocation support
- **Token Revocation**: JWT blacklist system with logout functionality
- **API Keys**: SHA-256 hashed storage with granular permissions
- **User Isolation**: All resources are scoped to authenticated users

### Input Validation & Security
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Request Validation**: express-validator for all input sanitization
- **SQL Injection Protection**: Parameterized queries with sanitized error messages
- **Rate Limiting**: Configurable limits per endpoint and user type
- **Security Headers**: Helmet.js with CSP and other protections
- **CORS Configuration**: Configurable origins and credentials

### Production Security
- **Environment Restrictions**: Warnings and protections for production usage
- **Secrets Management**: Cryptographically secure secrets generation
- **Error Sanitization**: Comprehensive sensitive data removal from logs and responses
- **Database Error Protection**: Generic error messages prevent information disclosure
- **Audit Logging**: Comprehensive request/response logging without sensitive data exposure

## 💾 Database Schema

### Core Tables
- **users**: User accounts with authentication data
- **subscription_plans**: Available subscription tiers
- **user_subscriptions**: Links users to their current plans
- **user_api_keys**: API key storage and management
- **api_usage**: Usage tracking and analytics
- **mock_endpoints**: User's mock endpoint configurations

### Key Features
- **Foreign Key Constraints**: Ensures data integrity
- **Indexes**: Optimized for common query patterns
- **Soft Deletes**: Preserves data for analytics
- **Audit Fields**: Created/updated timestamps on all tables

## 📊 Monitoring & Analytics

### Built-in Monitoring
- **Structured Logging**: Winston with JSON formatting
- **Health Checks**: Built-in health and metrics endpoints
- **Request Tracing**: Detailed request/response logging with correlation IDs
- **Performance Metrics**: Response times, delays, and processing stats

### Usage Analytics
- **Real-time Tracking**: API usage tracked per request
- **Quota Monitoring**: Current usage vs. plan limits
- **Endpoint Analytics**: Most used endpoints and response patterns
- **User Activity**: Registration, login, and usage patterns

## 🚢 Deployment

### Docker Production

```bash
# Build production image
docker build -t mirage-service .

# Run with environment variables
docker run -d \
  --name mirage \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e JWT_SECRET=your-production-secret \
  mirage-service
```

### Environment Configuration

**Production Environment Variables:**
```env
# Required in production
NODE_ENV=production
JWT_SECRET=very-long-random-secret-key-for-production
DB_HOST=production-db-host
DB_PASSWORD=secure-db-password

# Optional production settings
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://yourdomain.com
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test suites
npm test -- --grep "authentication"
npm test -- --grep "mock endpoints"
```

### Test Coverage
The test suite covers:
- Authentication flows (registration, login, JWT validation)
- Mock endpoint CRUD operations
- User isolation and security
- Quota enforcement
- API key management
- Error handling scenarios

## 🚨 Error Handling

The service provides detailed, structured error responses:

### Authentication Errors
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v1/auth/login"
}
```

### Quota Exceeded
```json
{
  "success": false,
  "message": "Monthly request limit exceeded (10 requests)",
  "code": "QUOTA_EXCEEDED",
  "details": {
    "quota_type": "requests",
    "usage_stats": {...},
    "upgrade_url": "/api/v1/subscription/plans"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Validation Errors
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
      }
    ]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

## 🔄 Migration Guide

If upgrading from a previous version without authentication:

1. **Backup your database**
2. **Run migrations**: `npm run db:migrate`
3. **Update environment variables** with JWT settings
4. **Update API calls** to include authentication headers
5. **Test all endpoints** with new authentication flow

## 📈 Roadmap

Planned features for future releases:

- [ ] Premium subscription tiers with higher limits
- [ ] Team collaboration features
- [ ] Webhook support for mock endpoints
- [ ] OpenAPI/Swagger documentation generation
- [ ] Mock endpoint sharing and templates
- [ ] Advanced analytics and reporting
- [ ] Integration with CI/CD pipelines

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 💬 Support

For questions, issues, or feature requests:
- Create an issue in the GitHub repository
- Check existing documentation
- Review the API examples above

---

**Happy Mocking! 🎭**