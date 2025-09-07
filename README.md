# Mirage - Dummy Data Service

A TypeScript-powered development tool for providing configurable mock endpoints to accelerate development.

## 🚀 Features

- **Mock Endpoint Management**: Create, read, update, and delete mock API endpoints
- **Intelligent Request Matching**: Pattern-based URL matching with parameter extraction
- **Request Validation**: JSON schema validation for incoming requests
- **Configurable Responses**: Custom status codes, delays, and response data
- **Production-Ready**: Comprehensive error handling, logging, and security middleware
- **Docker Support**: Full containerization with PostgreSQL integration

## 🏗️ Architecture

Built with modern TypeScript and best practices:

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with raw SQL queries
- **Validation**: AJV for JSON schema validation
- **Logging**: Winston with structured logging
- **Security**: Helmet, rate limiting, and CORS protection
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
   # Edit .env with your database credentials
   ```

3. **Set up the database**
   ```bash
   npm run db:setup
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Using Docker

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

The service will be available at `http://localhost:3000`

## 📚 API Reference

### Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/v1/mock-endpoints` | Create mock endpoint |
| GET    | `/api/v1/mock-endpoints` | List mock endpoints |
| GET    | `/api/v1/mock-endpoints/:id` | Get specific endpoint |
| PUT    | `/api/v1/mock-endpoints/:id` | Update mock endpoint |
| DELETE | `/api/v1/mock-endpoints/:id` | Deactivate endpoint |

### Mock Serving

| Method | Endpoint | Description |
|--------|----------|-------------|
| ANY    | `/mock/*` | Serve mock responses |
| GET    | `/health` | Health check |
| GET    | `/metrics` | Service metrics |
| GET    | `/debug/mocks` | List active mocks |

## 📖 Usage Examples

### Creating a Mock Endpoint

```bash
curl -X POST http://localhost:3000/api/v1/mock-endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Login",
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
      "token": "mock-jwt-token",
      "user": {"id": 1, "email": "user@example.com"}
    },
    "response_status_code": 200,
    "response_delay_ms": 300
  }'
```

### Using the Mock Endpoint

```bash
curl -X POST http://localhost:3000/mock/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### Pattern Matching Examples

The service supports flexible URL patterns:

- `/api/users/{id}` - Matches `/api/users/123`
- `/api/posts/*` - Matches `/api/posts/anything`
- `/api/exact-match` - Exact string matching

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking
npm run db:migrate   # Run database migrations
```

### Project Structure

```
src/
├── config/          # Configuration management
├── controllers/     # Request handlers
├── database/        # Database connection & migrations  
├── middleware/      # Express middleware
├── models/          # Data access layer
├── routes/          # Route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## 🔒 Security

- **Environment Restrictions**: Warnings for production usage
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Parameterized queries
- **Security Headers**: Helmet.js integration

## 🐛 Error Handling

The service provides detailed error responses:

```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR", 
  "details": {"errors": [...]},
  "timestamp": "2025-01-15T10:30:00Z",
  "path": "/api/v1/mock-endpoints"
}
```

## 📊 Monitoring

- **Structured Logging**: Winston with JSON formatting
- **Health Checks**: Built-in health and metrics endpoints
- **Request Tracing**: Detailed request/response logging
- **Performance Metrics**: Response times and delays

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
  mirage-service
```

### Environment Variables

See `.env.example` for all available configuration options.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
