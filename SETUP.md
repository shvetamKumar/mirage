# Setup Guide

## Quick Start Options

### Option 1: Using Docker (Recommended)

The easiest way to get started is using Docker Compose, which will set up both the application and PostgreSQL database:

```bash
# Start all services (app + database)
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f app
```

The service will be available at `http://localhost:3000`

### Option 2: Local Development

If you prefer to run the application locally:

1. **Start PostgreSQL**
   
   Make sure PostgreSQL is running locally. You can:
   - Install PostgreSQL locally
   - Or use Docker for just the database:
   ```bash
   docker run -d \
     --name postgres \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=mirage_dev \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your database credentials if needed
   ```

4. **Run database migrations**
   ```bash
   npm run db:setup
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Testing the Service

Once running, you can test the endpoints:

```bash
# Health check
curl http://localhost:3000/health

# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPassword123!"}' \
  | jq -r '.data.token')

# Create a mock endpoint (requires authentication)
curl -X POST http://localhost:3000/api/v1/mock-endpoints \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Endpoint",
    "method": "GET",
    "url_pattern": "/api/test",
    "response_data": {"message": "Hello from mock!"},
    "response_status_code": 200
  }'

# Use the mock endpoint
curl http://localhost:3000/mock/api/test
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. **Check PostgreSQL is running**
   ```bash
   # For Docker
   docker ps | grep postgres
   
   # For local PostgreSQL
   pg_isready -h localhost -p 5432
   ```

2. **Verify database credentials in .env file**
   - DB_HOST=localhost
   - DB_PORT=5432
   - DB_USER=postgres
   - DB_PASSWORD=password
   - DB_NAME=mirage_dev

3. **Create database manually if needed**
   ```sql
   CREATE DATABASE mirage_dev;
   ```

### Port Conflicts

If port 3000 is already in use:
- Change PORT in .env file
- Or use Docker: `docker-compose up -d` (uses different ports)

### Permission Issues

If you get permission errors with Docker:
```bash
sudo docker-compose up -d
```

## Development Configuration

### Environment Variables for Development

```env
# Core settings
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mirage_dev
DB_USER=postgres
DB_PASSWORD=password

# Authentication & Security
JWT_SECRET=your-development-jwt-secret-change-in-production
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CSRF_SECRET=your-csrf-protection-secret-change-in-production

# Development helpers
SKIP_EMAIL_VERIFICATION=true
LOG_LEVEL=debug

# CORS (for development)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### Dashboard Development

The web dashboard files are located in the `public/` directory:
- `public/index.html` - Main dashboard interface
- `public/css/styles.css` - Styling with black/white professional theme
- `public/js/app.js` - Single-page application logic

To make changes to the dashboard:
1. Edit files in the `public/` directory
2. Refresh the browser (no build step required)
3. Check browser console for any JavaScript errors

### API Testing with Dashboard

1. **Using Browser Network Tab**
   - Open developer tools (F12)
   - Go to Network tab
   - Perform actions in the dashboard
   - Inspect API calls and responses

2. **Dashboard API Integration**
   - All dashboard operations use the same API endpoints
   - JWT tokens are stored in localStorage
   - API errors are displayed in the dashboard interface

## Next Steps

After successful setup:

1. **Explore the Dashboard**
   - Register and login
   - Create your first mock endpoint
   - Test the endpoint from the dashboard or via curl
   - Check usage statistics

2. **Create API Keys**
   - Generate API keys for external application access
   - Use API keys instead of JWT tokens for long-term integration

3. **Review Documentation**
   - Check `API_REFERENCE.md` for complete API documentation
   - See `DEPLOYMENT.md` for production deployment
   - Review `CHANGELOG.md` for recent updates

4. **Development Workflow**
   - Use the dashboard for quick endpoint creation and testing
   - Use API directly for automation and CI/CD integration
   - Monitor usage to understand quota limits