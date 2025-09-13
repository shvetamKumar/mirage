# Changelog

All notable changes to the Mirage Mock Data Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-15

### 🎉 Major Release: User Authentication & Freemium Features

This major release transforms Mirage from a simple mock service into a full-featured SaaS platform with user authentication, subscription management, and usage tracking.

### Added

#### Authentication & User Management
- **User Registration System**: Complete user signup with email/password
- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **API Key Authentication**: Alternative authentication method with granular permissions
- **Email Verification**: User account verification system (configurable)
- **Password Security**: bcrypt hashing with configurable rounds (default: 12)
- **User Profiles**: Complete user profile management with dashboard

#### Freemium Subscription Model
- **Free Tier Limits**: 10 mock endpoints and 10 API requests per month
- **Subscription Plans**: Extensible subscription system with feature limits
- **Usage Tracking**: Real-time monitoring of API calls and endpoint creation
- **Quota Enforcement**: Automatic limiting with graceful error messages
- **Usage Analytics**: Comprehensive dashboard with usage statistics

#### User-Scoped Resources
- **Private Mock Endpoints**: All endpoints are now user-scoped and private
- **User Isolation**: Complete data separation between users
- **Resource Ownership**: Users can only access their own mock endpoints
- **Secure Multi-tenancy**: Full isolation with foreign key constraints

#### Enhanced Security
- **Rate Limiting**: Configurable limits per endpoint type and user
- **Input Validation**: Comprehensive request validation with express-validator  
- **SQL Injection Protection**: Parameterized queries with no ORM dependencies
- **Security Headers**: Enhanced Helmet configuration with CSP
- **Environment Security**: Production-ready security configurations

#### New API Endpoints

**Authentication APIs:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User authentication  
- `POST /api/v1/auth/verify-email` - Email verification
- `GET /api/v1/auth/profile` - User profile
- `GET /api/v1/auth/dashboard` - Usage dashboard with analytics
- `POST /api/v1/auth/api-keys` - Create API keys

**Enhanced Mock Management:**
- All existing `/api/v1/mock-endpoints/*` routes now require authentication
- User-scoped listing and filtering
- Quota checking on endpoint creation
- Usage tracking on mock requests

#### Database Schema
- **users**: User accounts with authentication data
- **subscription_plans**: Available subscription tiers with limits
- **user_subscriptions**: User-plan relationships with status tracking
- **user_api_keys**: API key storage with permissions and expiration
- **api_usage**: Detailed usage tracking and analytics
- **mock_endpoints**: Enhanced with user_id foreign key constraint

#### Developer Experience
- **Comprehensive API Documentation**: New `API_REFERENCE.md`
- **Deployment Guide**: Complete `DEPLOYMENT.md` with production configurations
- **Environment Templates**: Updated `.env.example` with all new variables
- **Migration System**: Automated database migrations for schema updates
- **Type Safety**: Full TypeScript coverage for all new features

### Changed

#### Breaking Changes
- **Authentication Required**: All mock endpoint management now requires authentication
- **Database Schema**: Added user_id to mock_endpoints (migration provided)
- **API Responses**: Enhanced error responses with structured format
- **Environment Variables**: New required variables for JWT and authentication

#### Improved Features
- **Enhanced Error Handling**: Structured error responses with error codes
- **Better Logging**: Request correlation IDs and structured logging
- **Performance**: Optimized database queries with proper indexing
- **Documentation**: Comprehensive updates to all documentation files

#### Mock Serving
- **Optional Authentication**: Mock serving supports optional auth for usage tracking
- **Usage Headers**: Response headers include endpoint and processing information
- **Quota Integration**: Usage counted against user quotas when authenticated

### Migration Guide

For existing installations:

1. **Backup your database** before upgrading
2. **Update environment variables**:
   ```env
   JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   BCRYPT_ROUNDS=12
   ```
3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```
4. **Update API clients** to include authentication headers
5. **Test the authentication flow** with new endpoints

### Technical Details

#### Architecture Improvements
- **No ORM Dependency**: Continued use of raw SQL for performance and control
- **Modular Design**: Clean separation of concerns with services, controllers, models
- **Middleware Pipeline**: Comprehensive middleware for auth, validation, and tracking
- **Production Ready**: Full Docker support with multi-stage builds

#### Security Enhancements
- **JWT Configuration**: Configurable token expiration and signing algorithms
- **Password Policies**: Enforced password complexity requirements
- **API Key Management**: SHA-256 hashed storage with permission scoping
- **Rate Limiting**: Tiered rate limits for different endpoint types
- **CORS Configuration**: Configurable origins for production deployment

#### Performance Features
- **Database Indexing**: Optimized indexes for user queries and usage tracking
- **Connection Pooling**: Enhanced database connection management
- **Caching Headers**: Appropriate cache headers for static resources
- **Compression**: Built-in response compression for better performance

### Dependencies

#### New Dependencies
- `bcrypt`: Secure password hashing
- `jsonwebtoken`: JWT token generation and validation
- `express-validator`: Request validation middleware

#### Updated Dependencies
- All existing dependencies updated to latest compatible versions
- Enhanced security with updated packages

### Documentation

#### New Documentation Files
- `API_REFERENCE.md`: Complete API documentation with examples
- `DEPLOYMENT.md`: Production deployment guide for all platforms
- Enhanced `README.md`: Updated with authentication and freemium features

#### Updated Documentation
- Complete README overhaul with new features
- Updated environment variable documentation
- Enhanced project structure documentation

---

## [1.0.0] - 2024-12-15

### Added
- Initial release of Mirage Mock Data Service
- Basic mock endpoint CRUD operations
- Pattern-based URL matching
- JSON schema request validation
- Configurable response delays and status codes
- Docker containerization
- PostgreSQL integration with raw SQL
- Comprehensive error handling
- Request/response logging
- Health check and metrics endpoints

### Core Features
- **Mock Endpoint Management**: Create, read, update, delete mock endpoints
- **Intelligent Matching**: Flexible URL pattern matching with parameters
- **Request Validation**: JSON schema validation for incoming requests
- **Response Customization**: Custom status codes, delays, and JSON responses
- **Production Ready**: Security middleware, rate limiting, CORS protection

### Technical Stack
- TypeScript with Express.js
- PostgreSQL database with raw SQL
- AJV for JSON schema validation
- Winston for structured logging
- Helmet for security headers
- Docker support with multi-stage builds

---

## Development Notes

### Version Numbering
- **Major versions** (X.0.0): Breaking changes or major feature additions
- **Minor versions** (X.Y.0): New features without breaking changes  
- **Patch versions** (X.Y.Z): Bug fixes and small improvements

### Release Process
1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Run tests: `npm test`
4. Build for production: `npm run build`
5. Tag release: `git tag v2.0.0`
6. Push changes and tags: `git push && git push --tags`

### Future Releases
- **v2.1.0**: Premium subscription tiers and team features
- **v2.2.0**: Webhook support and advanced analytics
- **v2.3.0**: OpenAPI/Swagger documentation generation
- **v3.0.0**: GraphQL support and real-time features